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
