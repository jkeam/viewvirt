import { path } from 'ramda';

// Helper functions
const formatStorage = (storage) => {
  if (storage && /^\d+$/.test(storage)) {
    return `${(storage / (1024 ** 3)).toFixed(0)}Gi`;
  }
  return storage;
}

export const transformVms = (fetched) => {
  if (!fetched) {
    return [];
  }
  const transform = (item) => {
    const dataVolumes = (item.data_volumes || []).map(i => {
      return {
        name: i.name,
        storage: formatStorage(i['storage']['resources']['requests']['storage'])
      }
    });
    const dataVolumeString = dataVolumes.map(d => `${d.name} (${d.storage})`).join(', ')
    return {
      name: item.name,
      namespace: item.namespace,
      os: item.os,
      cpu: item.cpu,
      memory: item.memory,
      requestedCpu: item.requested_cpu,
      requestedMemory: item.requested_memory,
      createdAt: item.created_at,
      machineType: item.machine_type,
      disks: item.disks || [],
      running: item.running,
      status: item.status,
      dataVolumes: dataVolumeString,
      interfaces: (item.interfaces || []).map(i => `${i.name} (${i.model})`).join(', '),
      // Keep raw data for detail view
      rawDataVolumes: item.data_volumes || [],
      rawInterfaces: item.interfaces || [],
      networkStatus: item.network_status || [],
      node: item.node
    };
  };
  return fetched.map(transform);
};

export const transformHosts = (fetched) => {
  if (!fetched) {
    return [];
  }

  const transform = (item) => {
    // Convert memory from Ki to Gi for readability
    const formatMemory = (memory) => {
      if (memory && memory.includes('Ki')) {
        const memoryKi = parseInt(memory.replace('Ki', ''));
        const memoryGi = (memoryKi / (1024 * 1024)).toFixed(2);
        return `${memoryGi} Gi`;
      }
      return memory;
    };

    return {
      name: item.name,
      cpu: item.cpu,
      usedCpu: item.actual_cpu_usage,
      usedMemory: formatMemory(item.actual_memory_usage),
      requestedCpu: item.requested_cpu,
      requestedMemory: item.requested_memory,
      memory: formatMemory(item.memory),
      totalCpuCapacity: item.total_cpu_capacity,
      totalMemoryCapacity: formatMemory(item.total_memory_capacity),
      hostIp: item.host_ip
    };
  };
  return fetched.map(transform);
};

export const transformStorages = (fetched) => {
  if (!fetched) {
    return [];
  }

  const transform = (item) => {
    let vm = '';
    if (item.vm && item.vm.length > 0) {
      vm = item.vm[0].name;
    }
    let storage = '';
    let storageClass = '';
    let accessModes = '';
    if (item.storage) {
      storage = formatStorage(path(['resources', 'requests', 'storage'], item.storage));
      storageClass = path(['storageClassName'], item.storage);
      if (item.storage.accessModes) {
        accessModes = (item.storage.accessModes).join(', ');
      }
    }
    let source = '';
    let type = 'blank';
    if (item.source) {
      const itemSource = item.source;
      if (itemSource.http) {
        type = 'http';
        source = itemSource.http.url;
      } else if (itemSource.pvc) {
        type = 'pvc';
        source = `namespace: ${itemSource.pvc.namespace}, pvc: ${itemSource.pvc.name}`;
      } else if (itemSource.registry) {
        type = 'registry';
        source = path(['url'], itemSource.registry).replace('docker://', '');
      }
    }

    return {
      name: item.name,
      vm,
      namespace: item.namespace,
      type,
      source,
      storage,
      storageClass,
      accessModes
    };
  };
  return fetched.map(transform);
};

export const transformNetworks = (fetched) => {
  if (!fetched) {
    return [];
  }

  const fetchedInterfaces = [];
  for (const vm of fetched) {
    const vmName = vm.name;
    for (const inter of vm.interfaces) {
      let ports = '';
      if (inter.ports) {
        ports = inter.ports.map(port => `${port.name} ${port.port} (${port.protocol})`).join(', ');
      }
      fetchedInterfaces.push({
        vmName,
        namespace: vm.namespace,
        name: inter.name,
        model: inter.model,
        macAddress: inter.macAddress,
        bridge: inter.bridge,
        masquerade: inter.masquerade,
        sriov: inter.sriov,
        ports,
        ipAddresses: inter.ip_addresses,
        interfaceName: inter.interface_name
      });
    }
  }
  return fetchedInterfaces;
};

export const transformVmnamespaces = (fetched) => {
  if (!fetched) {
    return [];
  }

  const fetchedVmnamespaces = [];
  for (const vm of fetched) {
    fetchedVmnamespaces.push(vm['namespace']);
  }
  return fetchedVmnamespaces;
};
