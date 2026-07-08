import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import {
  PageSection,
  Gallery,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Flex,
  FlexItem,
  Title,
  Divider,
} from '@patternfly/react-core';
import {
  CubeIcon,
  ServerIcon,
  DatabaseIcon,
  NetworkIcon,
} from '@patternfly/react-icons';
import { getVms, vmsAtom, getHosts, hostsAtom, getStorages, storagesAtom } from '../utils/store.js';

export default function Home() {
  const [vms, setVms] = useAtom(vmsAtom);
  const [hosts, setHosts] = useAtom(hostsAtom);
  const [storages, setStorages] = useAtom(storagesAtom);
  const [summary, setSummary] = useState({
    totalVMs: 0,
    runningVMs: 0,
    totalHosts: 0,
    totalCPU: 0,
    totalMemory: '0',
    totalStorage: 0,
  });

  useEffect(() => {
    (async () => {
      const fetchedVms = await getVms();
      setVms(fetchedVms);

      const fetchedHosts = await getHosts();
      setHosts(fetchedHosts);

      const fetchedStorages = await getStorages();
      setStorages(fetchedStorages);

      // Calculate summary
      const totalCPU = fetchedHosts.reduce((sum, host) => sum + parseInt(host.cpu || 0), 0);
      const totalMemory = fetchedHosts.reduce((sum, host) => {
        const memStr = host.memory || '0Ki';
        const memVal = parseInt(memStr.replace(/[^0-9]/g, ''));
        return sum + memVal;
      }, 0);

      setSummary({
        totalVMs: fetchedVms.length,
        runningVMs: fetchedVms.length,
        totalHosts: fetchedHosts.length,
        totalCPU,
        totalMemory: `${Math.round(totalMemory / (1024 * 1024))} GB`,
        totalStorage: fetchedStorages.length,
      });
    })();

    return () => {
      // unmount
    };
  }, []);

  const SummaryCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <Card isCompact>
      <CardBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <Icon size="lg" color={color} />
              </FlexItem>
              <FlexItem>
                <small>{title}</small>
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Title headingLevel="h2" size="2xl">
              {value}
            </Title>
          </FlexItem>
          {subtitle && (
            <FlexItem>
              <small style={{ color: '#6a6e73' }}>
                {subtitle}
              </small>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );

  return (
    <PageSection hasBodyWrapper={false}>
      <Grid hasGutter>
        <GridItem span={12}>
          <Title headingLevel="h1" size="xl">
            Cluster Summary
          </Title>
          <Divider style={{ marginTop: '16px', marginBottom: '24px' }} />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={CubeIcon}
            title="Virtual Machines"
            value={summary.totalVMs}
            subtitle={`${summary.runningVMs} running`}
            color="#06c"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={ServerIcon}
            title="Hosts"
            value={summary.totalHosts}
            subtitle={`${summary.totalCPU} total CPUs`}
            color="#3e8635"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={DatabaseIcon}
            title="Storage"
            value={summary.totalStorage}
            subtitle="data volumes"
            color="#c9190b"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={ServerIcon}
            title="Memory"
            value={summary.totalMemory}
            subtitle="total capacity"
            color="#f0ab00"
          />
        </GridItem>
      </Grid>
    </PageSection>
  );
}
