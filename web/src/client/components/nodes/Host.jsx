import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { PageSection, Spinner } from '@patternfly/react-core';
import BasicTable from '../common/BasicTable';
import { getHosts, hostsAtom } from '../../utils/store.js'

export default function Host() {
  const [hosts, setHosts] = useAtom(hostsAtom);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const fetched = await getHosts();
      setHosts(fetched);
      setLoading(false);
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

  if (loading) {
    return (
      <PageSection hasBodyWrapper={false}>
        <Spinner aria-label="Loading hosts" />
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false}>
      <BasicTable caption="" data={hosts} rows={rows} cols={cols} />
    </PageSection>
  );
}
