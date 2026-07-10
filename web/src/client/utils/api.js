export const fetchVms = async() => {
  const response = await fetch('/api/vms');
  const resp = await response.json();
  return resp['vms'];
}

export const fetchHosts = async() => {
  const response = await fetch('/api/hosts');
  const resp = await response.json();
  return resp['hosts'];
}

export const fetchStorages = async() => {
  const response = await fetch('/api/storages');
  const resp = await response.json();
  return resp['storages'];
}

export const fetchVmnamespaces = async() => {
  const response = await fetch('/api/vmnamespaces');
  const resp = await response.json();
  return resp['vmnamespaces'];
}

export const fetchNamespaces = async() => {
  const response = await fetch('/api/namespaces');
  const resp = await response.json();
  return resp['namespaces'];
}

export const fetchDatasources = async() => {
  const response = await fetch('/api/datasources');
  const resp = await response.json();
  return resp['datasources'];
}

export const startVm = async(namespace, name) => {
  const response = await fetch(`/api/vms/${namespace}/${name}/start`, {
    method: 'POST',
  });
  return await response.json();
}

export const stopVm = async(namespace, name) => {
  const response = await fetch(`/api/vms/${namespace}/${name}/stop`, {
    method: 'POST',
  });
  return await response.json();
}

export const restartVm = async(namespace, name) => {
  const response = await fetch(`/api/vms/${namespace}/${name}/restart`, {
    method: 'POST',
  });
  return await response.json();
}

export const deleteVm = async(namespace, name) => {
  const response = await fetch(`/api/vms/${namespace}/${name}`, {
    method: 'DELETE',
  });
  return await response.json();
}

export const createVm = async(vmSpec) => {
  try {
    // Convert numeric memory to string with Gi suffix for backend
    const vmSpecWithMemory = {
      ...vmSpec,
      memory: typeof vmSpec.memory === 'number' ? `${vmSpec.memory}Gi` : vmSpec.memory
    };

    const response = await fetch('/api/vms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vmSpecWithMemory),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return { status: 'error', message: errorData.message || `HTTP ${response.status}: ${response.statusText}` };
      } else {
        return { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
      }
    }

    return await response.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
