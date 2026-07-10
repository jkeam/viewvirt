from kubernetes import client, config
from kubernetes.config.config_exception import ConfigException
from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from os import environ
from sys import stdout
from logging import getLogger, DEBUG, StreamHandler, Formatter

# setup app
app = FastAPI(title="Virt API", summary="OCP Virt API", description="OCP Virt API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
);

# setup logger
logger = getLogger(__name__)
logger.setLevel(DEBUG)
stream_handler = StreamHandler(stdout)
stream_handler.setFormatter(Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
logger.addHandler(stream_handler)
logger.info("API is starting up")

try:
    logger.info("loaded auth")
    config.load_incluster_config()
except ConfigException:
    try:
        # Fall back to local kubeconfig (usually ~/.kube/config) for local development
        config.load_kube_config()
        logger.info("loaded local kubeconfig")
    except ConfigException:
        raise RuntimeError("Could not configure Kubernetes client. No config found.")

def list_all_pods():
    logger.info("list_all_pods")
    v1 = client.CoreV1Api()
    ret = v1.list_pod_for_all_namespaces(watch=False)
    for i in ret.items:
        logger.debug(f"{i.status.pod_ip}\t{i.metadata.namespace}\t{i.metadata.name}")

def fetch_pods(namespace:str) -> list[dict[str, str]]:
    logger.info("fetch_pods")
    v1 = client.CoreV1Api()
    pod_list = v1.list_namespaced_pod(namespace)
    return list(map(lambda pod: {
        "name": pod.metadata.name,
        "namespace": pod.metadata.namespace,
        "phase": pod.status.phase,
        "ip": pod.status.pod_ip
    }, pod_list.items))

def fetch_vmnamespaces() -> list[dict[str, str]]:
    """Returns namespaces that contain VirtualMachineInstances (for filtering)"""
    logger.info("fetch_vmnamespaces")
    api = client.CustomObjectsApi()
    instances = api.list_cluster_custom_object(group="kubevirt.io", version="v1", plural="virtualmachineinstances")
    unique_namespaces = list(set(instance['metadata']['namespace'] for instance in instances['items']))
    return list(map(lambda instance: {
        "namespace": instance
    }, unique_namespaces))

def fetch_namespaces() -> list[dict[str, str]]:
    """Returns all namespaces except those starting with 'openshift' (for VM creation)"""
    logger.info("fetch_namespaces")
    v1 = client.CoreV1Api()
    namespaces = v1.list_namespace()
    # Filter out namespaces starting with "openshift"
    filtered_namespaces = [
        ns.metadata.name for ns in namespaces.items
        if not ns.metadata.name.startswith("openshift")
    ]
    return list(map(lambda ns: {
        "namespace": ns
    }, filtered_namespaces))

def fetch_vms() -> list[dict[str, str]]:
    logger.info("fetch_vms")
    api = client.CustomObjectsApi()

    # Get VirtualMachines (persistent objects that exist even when stopped)
    vms = api.list_cluster_custom_object(group="kubevirt.io", version="v1", plural="virtualmachines")

    # Get VirtualMachineInstances (only exist when running)
    instances = api.list_cluster_custom_object(group="kubevirt.io", version="v1", plural="virtualmachineinstances")
    instance_by_name = {}
    for instance in instances['items']:
        instance_name = instance['metadata']['name']
        instance_namespace = instance['metadata']['namespace']
        instance_by_name[f"{instance_namespace}/{instance_name}"] = instance

    # map dv by its name
    data_volume_by_name = {}
    data_volumes = api.list_cluster_custom_object(group="cdi.kubevirt.io", version="v1beta1", plural="datavolumes")
    for dv in data_volumes['items']:
        dv_name = dv['metadata']['name']
        data_volume_by_name[dv_name] = dv['spec']

    result = []
    for vm in vms['items']:
        vm_name = vm['metadata']['name']
        vm_namespace = vm['metadata']['namespace']
        vm_key = f"{vm_namespace}/{vm_name}"
        instance = instance_by_name.get(vm_key)

        # Determine status - prioritize runStrategy over deprecated running field
        run_strategy = vm['spec'].get('runStrategy', None)
        running = vm['spec'].get('running', None)

        # Check VM status to see if it's actually trying to start
        vm_status = vm.get('status', {})
        vm_ready = vm_status.get('ready', False)
        vm_created = vm_status.get('created', False)

        if instance:
            # Instance exists - check if it's being stopped
            instance_phase = instance['status'].get('phase', 'Unknown')

            # If runStrategy is Halted but instance still exists, VM is stopping
            if run_strategy == 'Halted':
                status = 'Stopping'
            elif run_strategy is None and running == False:
                status = 'Stopping'
            else:
                # Use the actual instance phase
                status = instance_phase
        else:
            # No instance - check if VM is actually trying to start or just configured to run
            if run_strategy == 'Halted' or running == False:
                # Explicitly stopped
                status = 'Stopped'
            elif (run_strategy in ['Always', 'RerunOnFailure'] or running == True) and vm_created == False:
                # Configured to run but VMI hasn't been created yet = Pending (starting)
                status = 'Pending'
            elif run_strategy in ['Always', 'RerunOnFailure'] or running == True:
                # Configured to run but VMI was created and is now gone = check if it failed or stopped
                # If VM is not ready and no instance, it's likely stopped/failed
                status = 'Stopped'
            else:
                # Default to stopped
                status = 'Stopped'

        # Get VM spec from VM object or instance
        spec = instance['spec'] if instance else vm['spec']['template']['spec']

        # Map data volumes
        volumes = []
        for vol in spec.get('volumes', []):
            dv = vol.get('dataVolume', None)
            if dv:
                dv_name = dv['name']
                if dv_name in data_volume_by_name:
                    dv_spec = data_volume_by_name[dv_name].copy()
                    dv_spec['name'] = dv_name
                    volumes.append(dv_spec)

        # Get OS from instance annotations if available, otherwise from VM annotations
        os = 'Unknown'
        if instance:
            os = instance['metadata'].get('annotations', {}).get('vm.kubevirt.io/os', 'Unknown')
        if os == 'Unknown':
            os = vm['metadata'].get('annotations', {}).get('vm.kubevirt.io/os', 'Unknown')
        # Also try the template annotations
        if os == 'Unknown':
            os = vm['spec'].get('template', {}).get('metadata', {}).get('annotations', {}).get('vm.kubevirt.io/os', 'Unknown')

        # Get the node the VM is running on (only available when instance exists)
        node_name = None
        if instance:
            node_name = instance.get('status', {}).get('nodeName', None)

        # Merge interfaces spec with runtime status
        interfaces_spec = spec.get('domain', {}).get('devices', {}).get('interfaces', [])
        interfaces = []
        if instance:
            # Build map of interface status by name
            interfaces_status = instance.get('status', {}).get('interfaces', [])
            status_by_name = {iface.get('name'): iface for iface in interfaces_status}

            # Merge spec with status
            for iface_spec in interfaces_spec:
                iface_name = iface_spec.get('name', 'N/A')
                iface_status = status_by_name.get(iface_name, {})
                interfaces.append({
                    **iface_spec,
                    "interface_name": iface_status.get('interfaceName', 'N/A'),
                    "ip_address": iface_status.get('ipAddress', 'N/A'),
                    "ip_addresses": iface_status.get('ipAddresses', []),
                    "mac": iface_status.get('mac', 'N/A'),
                    "link_state": iface_status.get('linkState', 'down'),
                })
        else:
            # No instance running, just use spec
            for iface_spec in interfaces_spec:
                interfaces.append({
                    **iface_spec,
                    "link_state": 'down',
                })

        # Get resource requests if available
        resources = spec.get('domain', {}).get('resources', {})
        requests = resources.get('requests', {})

        result.append({
            "name": vm_name,
            "namespace": vm_namespace,
            "cpu": spec.get('domain', {}).get('cpu', {}).get('cores', 0),
            "memory": spec.get('domain', {}).get('memory', {}).get('guest', '0Mi'),
            "requested_cpu": requests.get('cpu', 'N/A'),
            "requested_memory": requests.get('memory', 'N/A'),
            "created_at": vm['metadata']['creationTimestamp'],
            "os": os,
            "disks": spec.get('domain', {}).get('devices', {}).get('disks', []),
            "data_volumes": volumes,
            "interfaces": interfaces,
            "machine_type": spec.get('domain', {}).get('machine', {}).get('type', 'Unknown'),
            "running": status not in ['Stopped', 'Halted'],
            "status": status,
            "node": node_name,
        })

    return result

def get_node_resource_usage() -> dict[str, dict[str, Union[float, str]]]:
    """Fetch actual CPU and memory usage from metrics API"""
    response = client.CustomObjectsApi().list_cluster_custom_object(
        group="metrics.k8s.io",
        version="v1beta1",
        plural="nodes"
    )

    usage_by_node = {}
    for node in response.get('items', []):
        node_name = node['metadata']['name']
        cpu_usage_raw = node['usage']['cpu']

        # Convert nanocores to cores (1 core = 1,000,000,000 nanocores)
        cpu_usage_cores = float(cpu_usage_raw.rstrip('n')) / 1_000_000_000

        usage_by_node[node_name] = {
            'actual_cpu_usage': round(cpu_usage_cores, 2),
            'actual_memory_usage': node['usage']['memory']
        }

    return usage_by_node

def get_node_requested_resources() -> dict[str, dict[str, Union[float, int]]]:
    """Calculate requested CPU and memory per node by summing pod requests"""
    v1 = client.CoreV1Api()
    pods = v1.list_pod_for_all_namespaces(watch=False)

    requested_by_node = {}

    for pod in pods.items:
        node_name = pod.spec.node_name
        if not node_name or pod.status.phase not in ['Running', 'Pending']:
            continue

        if node_name not in requested_by_node:
            requested_by_node[node_name] = {
                'requested_cpu': 0.0,
                'requested_memory': 0
            }

        # Sum up container requests
        for container in pod.spec.containers:
            if container.resources and container.resources.requests:
                # CPU can be in cores (e.g., "1") or millicores (e.g., "500m")
                cpu_request = container.resources.requests.get('cpu', '0')
                if cpu_request.endswith('m'):
                    cpu_cores = float(cpu_request.rstrip('m')) / 1000
                else:
                    cpu_cores = float(cpu_request)
                requested_by_node[node_name]['requested_cpu'] += cpu_cores

                # Memory can be in various units (Ki, Mi, Gi)
                memory_request = container.resources.requests.get('memory', '0')
                if memory_request.endswith('Ki'):
                    memory_bytes = int(memory_request.rstrip('Ki')) * 1024
                elif memory_request.endswith('Mi'):
                    memory_bytes = int(memory_request.rstrip('Mi')) * 1024 * 1024
                elif memory_request.endswith('Gi'):
                    memory_bytes = int(memory_request.rstrip('Gi')) * 1024 * 1024 * 1024
                else:
                    memory_bytes = int(memory_request) if memory_request.isdigit() else 0
                requested_by_node[node_name]['requested_memory'] += memory_bytes

    # Convert memory to Gi for readability
    for node_name in requested_by_node:
        memory_gi = requested_by_node[node_name]['requested_memory'] / (1024 * 1024 * 1024)
        requested_by_node[node_name]['requested_memory'] = f"{memory_gi:.2f}Gi"

    return requested_by_node

def fetch_hosts() -> list[dict[str, str]]:
    logger.info("fetch_hosts")
    usage_by_node = get_node_resource_usage()
    requested_by_node = get_node_requested_resources()
    api = client.CoreV1Api()
    hosts = api.list_node()
    return list(map(lambda host: {
        "name": host.metadata.name,
        "cpu": round(float(host.status.allocatable['cpu'].rstrip("m")) / 1000, 2),
        "memory": host.status.allocatable['memory'],
        "total_cpu_capacity": host.status.capacity['cpu'],
        "total_memory_capacity": host.status.capacity['memory'],
        "host_ip": list(filter(lambda address: (address.type == 'InternalIP'), host.status.addresses))[0].address,
        "actual_cpu_usage": usage_by_node.get(host.metadata.name, {}).get('actual_cpu_usage', 'N/A'),
        "actual_memory_usage": usage_by_node.get(host.metadata.name, {}).get('actual_memory_usage', 'N/A'),
        "requested_cpu": round(requested_by_node.get(host.metadata.name, {}).get('requested_cpu', 0), 2),
        "requested_memory": requested_by_node.get(host.metadata.name, {}).get('requested_memory', '0.00Gi')
    }, hosts.items))

def fetch_storages() -> list[dict[str, str]]:
    logger.info("fetch_storages")
    api = client.CustomObjectsApi()
    data_volumes = api.list_cluster_custom_object(group="cdi.kubevirt.io", version="v1beta1", plural="datavolumes")
    return list(map(lambda dv: {
        "name": dv['metadata']['name'],
        "namespace": dv['metadata']['namespace'],
        "vm": dv['metadata'].get('ownerReferences'),
        "source": dv['spec'].get('source'),
        "storage": dv['spec'].get('storage'),
    }, data_volumes['items']))

def fetch_datasources() -> list[dict[str, str]]:
    logger.info("fetch_datasources")
    api = client.CustomObjectsApi()
    try:
        data_sources = api.list_cluster_custom_object(group="cdi.kubevirt.io", version="v1beta1", plural="datasources")
        return list(map(lambda ds: {
            "name": ds['metadata']['name'],
            "namespace": ds['metadata']['namespace'],
            "source": ds['spec'].get('source'),
        }, data_sources['items']))
    except Exception as e:
        logger.error(f"Error fetching datasources: {e}")
        return []

@app.get("/")
def get_root():
    return {"message": "welcome to the best api"}

@app.get("/healthz")
def get_health():
    return {"status": "alive"}

@app.get("/pods")
def get_pods():
    return {"pods": fetch_pods('jkeam')}

@app.get("/vms")
def get_vms():
    return {"vms": fetch_vms()}

@app.get("/vmnamespaces")
def get_vmnamespaces():
    return {"vmnamespaces": fetch_vmnamespaces()}

@app.get("/namespaces")
def get_namespaces():
    return {"namespaces": fetch_namespaces()}

@app.get("/hosts")
def get_hosts():
    return {"hosts": fetch_hosts()}

@app.get("/storages")
def get_storages():
    return {"storages": fetch_storages()}

@app.get("/datasources")
def get_datasources():
    return {"datasources": fetch_datasources()}

@app.post("/vms/{namespace}/{name}/start")
def start_vm(namespace: str, name: str):
    logger.info(f"start_vm: {namespace}/{name}")
    api = client.CustomObjectsApi()
    try:
        # Use runStrategy instead of the deprecated running field
        # runStrategy: Always means the VM should always be running
        api.patch_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=namespace,
            plural="virtualmachines",
            name=name,
            body={"spec": {"runStrategy": "Always"}}
        )
        return {"status": "started", "namespace": namespace, "name": name}
    except Exception as e:
        logger.error(f"Error starting VM: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/vms/{namespace}/{name}/stop")
def stop_vm(namespace: str, name: str):
    logger.info(f"stop_vm: {namespace}/{name}")
    api = client.CustomObjectsApi()
    try:
        # Use runStrategy instead of the deprecated running field
        # runStrategy: Halted means the VM should be stopped
        api.patch_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=namespace,
            plural="virtualmachines",
            name=name,
            body={"spec": {"runStrategy": "Halted"}}
        )
        return {"status": "stopped", "namespace": namespace, "name": name}
    except Exception as e:
        logger.error(f"Error stopping VM: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/vms/{namespace}/{name}/restart")
def restart_vm(namespace: str, name: str):
    logger.info(f"restart_vm: {namespace}/{name}")
    api = client.CustomObjectsApi()
    try:
        # Delete the VMI to trigger a restart
        api.delete_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=namespace,
            plural="virtualmachineinstances",
            name=name
        )
        return {"status": "restarted", "namespace": namespace, "name": name}
    except Exception as e:
        logger.error(f"Error restarting VM: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/vms/{namespace}/{name}/vnc")
def get_vnc_info(namespace: str, name: str):
    logger.info(f"get_vnc_info: {namespace}/{name}")
    try:
        # Get the VirtualMachineInstance to check if it's running
        api = client.CustomObjectsApi()
        vmi = api.get_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=namespace,
            plural="virtualmachineinstances",
            name=name
        )

        # Get the node the VM is running on
        node_name = vmi.get('status', {}).get('nodeName', None)

        if not node_name:
            return {"status": "error", "message": "VM is not running on any node"}

        # VNC is available via virtctl or KubeVirt's VNC proxy
        # For simplicity, we'll return connection info
        return {
            "status": "available",
            "namespace": namespace,
            "name": name,
            "node": node_name,
            "message": "VNC console available"
        }
    except Exception as e:
        logger.error(f"Error getting VNC info: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/vms/{namespace}/{name}")
def delete_vm(namespace: str, name: str):
    logger.info(f"delete_vm: {namespace}/{name}")
    api = client.CustomObjectsApi()
    try:
        # Delete the VirtualMachine resource
        api.delete_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=namespace,
            plural="virtualmachines",
            name=name
        )
        return {"status": "deleted", "namespace": namespace, "name": name}
    except Exception as e:
        logger.error(f"Error deleting VM: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/vms")
def create_vm(vm_data: dict):
    logger.info(f"create_vm: {vm_data.get('name')} in namespace {vm_data.get('namespace')}")
    api = client.CustomObjectsApi()

    try:
        # Validate required fields
        if not vm_data.get('name'):
            return {"status": "error", "message": "VM name is required"}
        if not vm_data.get('namespace'):
            return {"status": "error", "message": "Namespace is required"}
        if not vm_data.get('cpu') or vm_data['cpu'] <= 0:
            return {"status": "error", "message": "CPU cores must be greater than 0"}
        if not vm_data.get('memory'):
            return {"status": "error", "message": "Memory is required"}
        if not vm_data.get('disks') or len(vm_data['disks']) == 0:
            return {"status": "error", "message": "At least one disk is required"}

        # Build KubeVirt VirtualMachine spec
        vm_spec = {
            "apiVersion": "kubevirt.io/v1",
            "kind": "VirtualMachine",
            "metadata": {
                "name": vm_data['name'],
                "namespace": vm_data['namespace'],
                "labels": {
                    "kubevirt.io/vm": vm_data['name']
                }
            },
            "spec": {
                "runStrategy": vm_data.get('runStrategy', 'Manual'),
                "template": {
                    "metadata": {
                        "labels": {
                            "kubevirt.io/vm": vm_data['name']
                        }
                    },
                    "spec": {
                        "domain": {
                            "cpu": {
                                "cores": vm_data['cpu']
                            },
                            "memory": {
                                "guest": vm_data['memory']
                            },
                            "devices": {
                                "disks": [],
                                "interfaces": []
                            }
                        },
                        "volumes": [],
                        "networks": []
                    }
                }
            }
        }

        # Add OS annotation if provided
        if vm_data.get('os'):
            vm_spec['metadata']['annotations'] = {"vm.kubevirt.io/os": vm_data['os']}

        # Build disks and volumes
        data_volume_templates = []
        for idx, disk in enumerate(vm_data['disks']):
            disk_name = disk.get('name', f"disk{idx}")

            # Add disk to devices
            disk_device = {
                "name": disk_name,
                "disk": {"bus": "virtio"}
            }
            if disk.get('bootOrder'):
                disk_device['bootOrder'] = disk['bootOrder']
            vm_spec['spec']['template']['spec']['domain']['devices']['disks'].append(disk_device)

            # Add volume based on source type
            if disk.get('source') == 'existing':
                # Reference existing DataVolume
                vm_spec['spec']['template']['spec']['volumes'].append({
                    "name": disk_name,
                    "dataVolume": {
                        "name": disk.get('dataVolumeName')
                    }
                })
            elif disk.get('source') == 'new':
                # Create DataVolume template from container image
                dv_name = f"{vm_data['name']}-{disk_name}"
                data_volume_templates.append({
                    "metadata": {
                        "name": dv_name
                    },
                    "spec": {
                        "source": {
                            "registry": {
                                "url": f"docker://{disk.get('imageUrl')}"
                            }
                        },
                        "storage": {
                            "accessModes": ["ReadWriteOnce"],
                            "resources": {
                                "requests": {
                                    "storage": disk.get('size', '10Gi')
                                }
                            }
                        }
                    }
                })
                vm_spec['spec']['template']['spec']['volumes'].append({
                    "name": disk_name,
                    "dataVolume": {
                        "name": dv_name
                    }
                })
            elif disk.get('source') == 'clone':
                # Clone from DataSource (e.g., from openshift-virtualization-os-images)
                dv_name = f"{vm_data['name']}-{disk_name}"
                data_volume_templates.append({
                    "metadata": {
                        "name": dv_name
                    },
                    "spec": {
                        "sourceRef": {
                            "kind": "DataSource",
                            "name": disk.get('dataSourceName'),
                            "namespace": disk.get('dataSourceNamespace', 'openshift-virtualization-os-images')
                        },
                        "storage": {
                            "accessModes": ["ReadWriteOnce"],
                            "resources": {
                                "requests": {
                                    "storage": disk.get('size', '30Gi')
                                }
                            }
                        }
                    }
                })
                vm_spec['spec']['template']['spec']['volumes'].append({
                    "name": disk_name,
                    "dataVolume": {
                        "name": dv_name
                    }
                })

        # Add dataVolumeTemplates if any
        if data_volume_templates:
            vm_spec['spec']['dataVolumeTemplates'] = data_volume_templates

        # Build networks and interfaces
        for network in vm_data.get('networks', []):
            network_name = network.get('name', 'default')

            # Add interface
            vm_spec['spec']['template']['spec']['domain']['devices']['interfaces'].append({
                "name": network_name,
                "model": network.get('model', 'virtio'),
                "masquerade": {} if network.get('type') == 'pod' else None,
                "bridge": {} if network.get('type') == 'multus' else None
            })

            # Add network
            if network.get('type') == 'pod':
                vm_spec['spec']['template']['spec']['networks'].append({
                    "name": network_name,
                    "pod": {}
                })
            elif network.get('type') == 'multus':
                vm_spec['spec']['template']['spec']['networks'].append({
                    "name": network_name,
                    "multus": {
                        "networkName": network.get('multusNetwork', 'default')
                    }
                })

        # Add cloud-init if provided
        if vm_data.get('cloudInit'):
            vm_spec['spec']['template']['spec']['volumes'].append({
                "name": "cloudinitdisk",
                "cloudInitNoCloud": {
                    "userData": vm_data['cloudInit']
                }
            })
            vm_spec['spec']['template']['spec']['domain']['devices']['disks'].append({
                "name": "cloudinitdisk",
                "disk": {"bus": "virtio"}
            })

        # Create the VM
        created_vm = api.create_namespaced_custom_object(
            group="kubevirt.io",
            version="v1",
            namespace=vm_data['namespace'],
            plural="virtualmachines",
            body=vm_spec
        )

        logger.info(f"Successfully created VM: {vm_data['name']} in namespace {vm_data['namespace']}")
        return {"status": "success", "vm": created_vm}

    except Exception as e:
        logger.error(f"Error creating VM: {e}")
        return {"status": "error", "message": str(e)}
