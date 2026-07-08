import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  CpuIcon,
} from '@patternfly/react-icons';
import { getVms, vmsAtom, getHosts, hostsAtom, getStorages, storagesAtom } from '../utils/store.js';

export default function Home() {
  const [vms, setVms] = useAtom(vmsAtom);
  const [hosts, setHosts] = useAtom(hostsAtom);
  const [storages, setStorages] = useAtom(storagesAtom);
  const [summary, setSummary] = useState({
    totalVMs: 0,
    runningVMs: 0,
    stoppedVMs: 0,
    totalHosts: 0,
    totalCPU: 0,
    usedCPU: 0,
    totalMemory: '0',
    totalStorage: 0,
    totalStorageSize: '0',
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
        const memStr = host.memory || '0 Gi';
        // Memory is now in Gi format (e.g., "16.00 Gi")
        if (memStr.includes('Gi')) {
          const memVal = parseFloat(memStr.replace(' Gi', ''));
          return sum + memVal;
        }
        return sum;
      }, 0);

      // Count running and stopped VMs based on status
      const runningVMs = fetchedVms.filter(vm => vm.status === 'Running').length;
      const stoppedVMs = fetchedVms.filter(vm => vm.status === 'Stopped').length;

      // Calculate total CPUs used by all VMs
      const usedCPU = fetchedVms.reduce((sum, vm) => sum + parseInt(vm.cpu || 0), 0);

      // Calculate total storage size
      const totalStorageSize = fetchedStorages.reduce((sum, storage) => {
        const storageStr = storage.storage || '0Gi';
        // Storage is in Gi format (e.g., "10Gi")
        if (storageStr.includes('Gi')) {
          const storageVal = parseFloat(storageStr.replace('Gi', ''));
          return sum + storageVal;
        }
        return sum;
      }, 0);

      setSummary({
        totalVMs: fetchedVms.length,
        runningVMs,
        stoppedVMs,
        totalHosts: fetchedHosts.length,
        totalCPU,
        usedCPU,
        totalMemory: `${totalMemory.toFixed(2)} GB`,
        totalStorage: fetchedStorages.length,
        totalStorageSize: `${totalStorageSize.toFixed(0)} GB`,
      });
    })();

    return () => {
      // unmount
    };
  }, []);

  const SummaryCard = ({ icon: Icon, title, value, subtitle, color = 'blue', linkTo }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Card
          isCompact
          isClickable
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: isHovered
              ? '0 8px 16px rgba(0, 0, 0, 0.15)'
              : '0 2px 4px rgba(0, 0, 0, 0.1)',
            border: isHovered ? `2px solid ${color}` : '1px solid #d2d2d2',
            backgroundColor: isHovered ? '#f5f5f5' : '#fff',
          }}
        >
          <CardBody style={{ padding: '24px' }}>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <Icon size="lg" color={color} />
                  </FlexItem>
                  <FlexItem>
                    <small style={{ fontWeight: '600', fontSize: '0.9rem' }}>{title}</small>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem>
                <Title headingLevel="h2" size="2xl" style={{ fontWeight: 'bold' }}>
                  {value}
                </Title>
              </FlexItem>
              {subtitle && (
                <FlexItem>
                  <small style={{ color: '#6a6e73', fontSize: '0.85rem' }}>
                    {subtitle}
                  </small>
                </FlexItem>
              )}
            </Flex>
          </CardBody>
        </Card>
      </Link>
    );
  };

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
            subtitle={`${summary.runningVMs} running, ${summary.stoppedVMs} stopped`}
            color="#06c"
            linkTo="/vms"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={CpuIcon}
            title="CPU"
            value={`${summary.totalCPU - summary.usedCPU} free`}
            subtitle={`${summary.totalCPU} total, ${summary.usedCPU} used by VMs`}
            color="#8476d1"
            linkTo="/hosts"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={DatabaseIcon}
            title="Storage"
            value={`${summary.totalStorage} devices`}
            subtitle={`${summary.totalStorageSize} total allocated`}
            color="#c9190b"
            linkTo="/storages"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={ServerIcon}
            title="Memory"
            value={summary.totalMemory}
            subtitle="total capacity"
            color="#f0ab00"
            linkTo="/hosts"
          />
        </GridItem>
        <GridItem lg={3} md={6} sm={12}>
          <SummaryCard
            icon={ServerIcon}
            title="Hosts"
            value={summary.totalHosts}
            subtitle={`${summary.totalCPU} total CPUs`}
            color="#3e8635"
            linkTo="/hosts"
          />
        </GridItem>
      </Grid>
    </PageSection>
  );
}
