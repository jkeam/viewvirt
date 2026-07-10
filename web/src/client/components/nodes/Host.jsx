import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { PageSection } from '@patternfly/react-core';
import BasicTable from '../common/BasicTable';
import { getHosts, hostsAtom } from '../../utils/store.js'

export default function Host() {
  const [hosts, setHosts] = useAtom(hostsAtom);
  useEffect(() => {
    (async () => {
      const fetched = await getHosts();
      setHosts(fetched);
    })();

    return () => {
      // unmount
    };
  }, []);

  const cols = ['Name', 'IP', 'Requested CPU', 'Used CPU', 'Allocatable CPU', 'Total CPU', 'Requested Memory', 'Used Memory', 'Allocatable Memory', 'Total Memory'];
  const rows = (item) => {
    return [
      item.name,
      item.hostIp,
      item.requestedCpu,
      item.usedCpu,
      item.cpu,
      item.totalCpuCapacity,
      item.requestedMemory,
      item.usedMemory,
      item.memory,
      item.totalMemoryCapacity,
    ];
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <BasicTable caption="" data={hosts} rows={rows} cols={cols} />
    </PageSection>
  );
}
