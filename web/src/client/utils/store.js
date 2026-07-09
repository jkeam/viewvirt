import { atom } from 'jotai';
import {
  fetchVms,
  fetchHosts,
  fetchStorages,
  fetchVmnamespaces,
} from './api.js';
import {
  transformVms,
  transformHosts,
  transformStorages,
  transformNetworks,
  transformVmnamespaces,
} from './transformers.js';

// Dark mode atom with localStorage persistence
const darkModeAtomBase = atom(
  typeof window !== 'undefined'
    ? localStorage.getItem('darkMode') === 'true'
    : false
);

export const darkModeAtom = atom(
  (get) => get(darkModeAtomBase),
  (get, set, newValue) => {
    set(darkModeAtomBase, newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newValue));
    }
  }
);

export const vmsAtom = atom([]);
export const getVms = async () => {
  const fetched = await fetchVms();
  return transformVms(fetched);
};

export const hostsAtom = atom([]);
export const getHosts = async () => {
  const fetched = await fetchHosts();
  return transformHosts(fetched);
};

export const storagesAtom = atom([]);
export const getStorages = async () => {
  const fetched = await fetchStorages();
  return transformStorages(fetched);
}

export const networksAtom = atom([]);
export const getNetworks = async () => {
  const fetched = await fetchVms();
  return transformNetworks(fetched);
}

export const vmnamespacesAtom = atom([]);
export const getVmnamespaces = async () => {
  const fetched = await fetchVmnamespaces();
  return transformVmnamespaces(fetched);
}

export const vmCreateFormAtom = atom({
  name: '',
  namespace: '',
  os: '',
  cpu: 1,
  memory: '2Gi',
  disks: [{
    name: 'disk0',
    source: 'existing',
    dataVolumeName: '',
    imageUrl: '',
    size: '10Gi',
    bootOrder: 1
  }],
  networks: [{name: 'default', type: 'pod', model: 'virtio'}],
  cloudInit: '',
  runStrategy: 'RerunOnFailure'
});
