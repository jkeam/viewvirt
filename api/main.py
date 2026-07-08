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
    logger.info("fetch_vmnamespaces")
    api = client.CustomObjectsApi()
    instances = api.list_cluster_custom_object(group="kubevirt.io", version="v1", plural="virtualmachineinstances")
    unique_namespaces = list(set(instance['metadata']['namespace'] for instance in instances['items']))
    return list(map(lambda instance: {
        "namespace": instance
    }, unique_namespaces))

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

        result.append({
            "name": vm_name,
            "namespace": vm_namespace,
            "cpu": spec.get('domain', {}).get('cpu', {}).get('cores', 0),
            "memory": spec.get('domain', {}).get('memory', {}).get('guest', '0Mi'),
            "created_at": vm['metadata']['creationTimestamp'],
            "os": vm['metadata'].get('annotations', {}).get('vm.kubevirt.io/os', 'Unknown'),
            "disks": spec.get('domain', {}).get('devices', {}).get('disks', []),
            "data_volumes": volumes,
            "interfaces": spec.get('domain', {}).get('devices', {}).get('interfaces', []),
            "machine_type": spec.get('domain', {}).get('machine', {}).get('type', 'Unknown'),
            "running": status not in ['Stopped', 'Halted'],
            "status": status,
        })

    return result

def fetch_nodes() -> list[dict[str, str]]:
    logger.info("fetch_nodes")
    api = client.CoreV1Api()
    nodes = api.list_node()
    return list(map(lambda node: {
        "name": node.metadata.name,
        "cpu": node.status.capacity['cpu'],
        "memory": node.status.capacity['memory'],
        "host_ip": list(filter(lambda address: (address.type == 'InternalIP'), node.status.addresses))[0].address
    }, nodes.items))

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

@app.get("/nodes")
def get_nodes():
    return {"nodes": fetch_nodes()}

@app.get("/storages")
def get_storages():
    return {"storages": fetch_storages()}

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
