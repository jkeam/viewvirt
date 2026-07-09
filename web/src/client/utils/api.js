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

export const createVm = async(vmSpec) => {
  try {
    const response = await fetch('/api/vms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vmSpec),
    });
    return await response.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
