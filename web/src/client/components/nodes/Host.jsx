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

  const cols = ['Name', 'Allocatable CPUs', 'Total CPU', 'Allocatable Memory', 'Total Memory', 'Host IP'];
  const rows = (item) => {
    return [
      item.name,
      item.cpu,
      item.totalCpuCapacity,
      item.memory,
      item.totalMemoryCapacity,
      item.hostIp,
    ];
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <BasicTable caption="" data={hosts} rows={rows} cols={cols} />
    </PageSection>
  );
}
