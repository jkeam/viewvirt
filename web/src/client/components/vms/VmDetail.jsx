import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageSection,
  Tabs,
  Tab,
  TabTitleText,
  Card,
  CardBody,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  Button,
  Flex,
  FlexItem,
  Label,
  Divider,
} from '@patternfly/react-core';
import {
  PlayIcon,
  StopIcon,
  RedoIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { getVms } from '../../utils/store.js';
import { startVm, stopVm, restartVm, deleteVm } from '../../utils/api.js';

export default function VmDetail() {
  const { namespace, name } = useParams();
  const navigate = useNavigate();
  const [vm, setVm] = useState(null);
  const [activeTabKey, setActiveTabKey] = useState(0);
  const [operatingVm, setOperatingVm] = useState(false);

  useEffect(() => {
    const fetchVmData = async () => {
      const vms = await getVms();
      const foundVm = vms.find(v => v.namespace === namespace && v.name === name);
      setVm(foundVm);
    };

    // Initial fetch
    fetchVmData();

    // Poll every 10 seconds to update VM status
    const interval = setInterval(fetchVmData, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [namespace, name]);

  const handleVmAction = async (action) => {
    setOperatingVm(true);
    try {
      if (action === 'start') {
        await startVm(namespace, name);
      } else if (action === 'stop') {
        await stopVm(namespace, name);
      } else if (action === 'restart') {
        await restartVm(namespace, name);
      } else if (action === 'delete') {
        await deleteVm(namespace, name);
        // Navigate back to VM list after successful deletion
        navigate('/vms', {
          state: {
            alert: { type: 'success', message: `VM ${name} deleted successfully` }
          }
        });
        return; // Exit early since we're navigating away
      }
      // Immediate refresh after action
      const vms = await getVms();
      const foundVm = vms.find(v => v.namespace === namespace && v.name === name);
      setVm(foundVm);
      // Keep operatingVm set for 2 seconds to prevent double-clicks
      setTimeout(() => setOperatingVm(false), 2000);
    } catch (error) {
      console.error('VM action error:', error);
      setOperatingVm(false);
    }
  };

  if (!vm) {
    return (
      <PageSection hasBodyWrapper={false}>
        <Title headingLevel="h1">Loading...</Title>
      </PageSection>
    );
  }

  const getStatusDescription = (status) => {
    switch (status) {
      case 'Running':
        return 'The virtual machine is currently running and operational.';
      case 'Stopped':
        return 'The virtual machine is stopped and not consuming resources.';
      case 'Pending':
      case 'Scheduling':
      case 'Scheduled':
      case 'Starting':
      case 'Provisioning':
        return 'The virtual machine is starting up or being provisioned.';
      case 'Stopping':
      case 'Succeeded':
        return 'The virtual machine is shutting down.';
      case 'Failed':
        return 'The virtual machine has encountered an error.';
      default:
        return 'The virtual machine is in an unknown state.';
    }
  };

  // Intelligent button states based on VM status
  // Disable start if: operating, running, pending, scheduling, or any starting state
  const runningStates = ['Running', 'Pending', 'Scheduling', 'Scheduled', 'Starting', 'Provisioning'];
  const stoppingStates = ['Stopping', 'Succeeded'];
  const canStart = !operatingVm && !runningStates.includes(vm.status) && !stoppingStates.includes(vm.status);
  // Allow stop if Running OR in any pending/starting state (to cancel startup), but not if already stopping
  const canStop = !operatingVm && runningStates.includes(vm.status) && !stoppingStates.includes(vm.status);
  const canRestart = !operatingVm && vm.status === 'Running';

  return (
    <PageSection hasBodyWrapper={false}>
      <Grid hasGutter>
        <GridItem span={12}>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                {vm.name}
              </Title>
              <div style={{ marginTop: '8px' }}>
                <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Label color="blue">
                      {vm.namespace}
                    </Label>
                  </FlexItem>
                  <FlexItem>
                    <Label color={vm.status === 'Running' ? 'green' : vm.status === 'Stopped' ? 'grey' : 'orange'}>
                      {vm.status}
                    </Label>
                  </FlexItem>
                </Flex>
              </div>
            </FlexItem>
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    variant="primary"
                    icon={<PlayIcon />}
                    onClick={() => handleVmAction('start')}
                    isDisabled={!canStart}
                  >
                    Start
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="warning"
                    icon={<StopIcon />}
                    onClick={() => handleVmAction('stop')}
                    isDisabled={!canStop}
                  >
                    Stop
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    icon={<RedoIcon />}
                    onClick={() => handleVmAction('restart')}
                    isDisabled={!canRestart}
                  >
                    Restart
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="danger"
                    icon={<TrashIcon />}
                    onClick={() => handleVmAction('delete')}
                    isDisabled={operatingVm}
                  >
                    Delete
                  </Button>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
          <Divider style={{ marginTop: '16px', marginBottom: '16px' }} />
        </GridItem>
        <GridItem span={12}>
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
          >
            <Tab eventKey={0} title={<TabTitleText>Summary</TabTitleText>}>
              <Card>
                <CardBody>
                  <Grid hasGutter>
                    <GridItem span={6}>
                      <Title headingLevel="h3" size="lg">VM Details</Title>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Name</DescriptionListTerm>
                          <DescriptionListDescription>{vm.name}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Namespace</DescriptionListTerm>
                          <DescriptionListDescription>{vm.namespace}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Status</DescriptionListTerm>
                          <DescriptionListDescription>
                            <div>
                              <Label color={vm.status === 'Running' ? 'green' : vm.status === 'Stopped' ? 'grey' : 'orange'}>
                                {vm.status}
                              </Label>
                              <div style={{ marginTop: '8px', color: '#6a6e73', fontSize: '0.875rem' }}>
                                {getStatusDescription(vm.status)}
                              </div>
                            </div>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Operating System</DescriptionListTerm>
                          <DescriptionListDescription>{vm.os}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Created</DescriptionListTerm>
                          <DescriptionListDescription>{vm.createdAt}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Machine Type</DescriptionListTerm>
                          <DescriptionListDescription>{vm.machineType}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </GridItem>
                    <GridItem span={6}>
                      <Title headingLevel="h3" size="lg">Hardware</Title>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>CPUs</DescriptionListTerm>
                          <DescriptionListDescription>{vm.cpu} cores</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Memory</DescriptionListTerm>
                          <DescriptionListDescription>{vm.memory}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </GridItem>
                  </Grid>
                </CardBody>
              </Card>
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Hardware</TabTitleText>}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg">CPU & Memory</Title>
                  <DescriptionList>
                    <DescriptionListGroup>
                      <DescriptionListTerm>CPUs</DescriptionListTerm>
                      <DescriptionListDescription>{vm.cpu} cores</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Memory</DescriptionListTerm>
                      <DescriptionListDescription>{vm.memory}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Machine Type</DescriptionListTerm>
                      <DescriptionListDescription>{vm.machineType}</DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </CardBody>
              </Card>
            </Tab>
            <Tab eventKey={2} title={<TabTitleText>Storage</TabTitleText>}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg">Disks</Title>
                  {vm.disks && vm.disks.map((disk, idx) => (
                    <div key={idx} style={{ marginBottom: '16px' }}>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Disk Name</DescriptionListTerm>
                          <DescriptionListDescription>{disk.name}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Type</DescriptionListTerm>
                          <DescriptionListDescription>{disk.disk?.bus || 'N/A'}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                      {idx < vm.disks.length - 1 && <Divider style={{ marginTop: '16px' }} />}
                    </div>
                  ))}
                  {vm.rawDataVolumes && vm.rawDataVolumes.length > 0 && (
                    <>
                      <Divider style={{ margin: '24px 0' }} />
                      <Title headingLevel="h3" size="lg">Data Volumes</Title>
                      {vm.rawDataVolumes.map((dv, idx) => (
                        <div key={idx} style={{ marginBottom: '16px' }}>
                          <DescriptionList>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Volume Name</DescriptionListTerm>
                              <DescriptionListDescription>{dv.name}</DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Storage Class</DescriptionListTerm>
                              <DescriptionListDescription>
                                {dv.storage?.storageClassName || 'N/A'}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Size</DescriptionListTerm>
                              <DescriptionListDescription>
                                {dv.storage?.resources?.requests?.storage || 'N/A'}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                          {idx < vm.rawDataVolumes.length - 1 && <Divider style={{ marginTop: '16px' }} />}
                        </div>
                      ))}
                    </>
                  )}
                </CardBody>
              </Card>
            </Tab>
            <Tab eventKey={3} title={<TabTitleText>Network</TabTitleText>}>
              <Card>
                <CardBody>
                  <Title headingLevel="h3" size="lg">Network Configuration</Title>
                  {vm.rawInterfaces && vm.rawInterfaces.map((iface, idx) => {
                    // Find matching network status for this interface
                    const netStatus = vm.networkStatus?.find(ns => ns.name === iface.name);

                    return (
                      <div key={idx} style={{ marginBottom: '16px' }}>
                        <DescriptionList>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Interface Name</DescriptionListTerm>
                            <DescriptionListDescription>{iface.name}</DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Type</DescriptionListTerm>
                            <DescriptionListDescription>
                              {iface.bridge ? 'Bridge' : iface.masquerade ? 'Masquerade' : iface.sriov ? 'SR-IOV' : 'N/A'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Network</DescriptionListTerm>
                            <DescriptionListDescription>
                              {iface.bridge?.name || iface.masquerade?.name || 'Pod Network'}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Model</DescriptionListTerm>
                            <DescriptionListDescription>{iface.model || 'virtio'}</DescriptionListDescription>
                          </DescriptionListGroup>
                          {netStatus && (
                            <>
                              {netStatus.ip_address && netStatus.ip_address !== 'N/A' && (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>IP Address</DescriptionListTerm>
                                  <DescriptionListDescription>{netStatus.ip_address}</DescriptionListDescription>
                                </DescriptionListGroup>
                              )}
                              {netStatus.ip_addresses && netStatus.ip_addresses.length > 0 && (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>All IP Addresses</DescriptionListTerm>
                                  <DescriptionListDescription>{netStatus.ip_addresses.join(', ')}</DescriptionListDescription>
                                </DescriptionListGroup>
                              )}
                              {netStatus.mac && netStatus.mac !== 'N/A' && (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>MAC Address</DescriptionListTerm>
                                  <DescriptionListDescription>{netStatus.mac}</DescriptionListDescription>
                                </DescriptionListGroup>
                              )}
                              {netStatus.interface_name && netStatus.interface_name !== 'N/A' && (
                                <DescriptionListGroup>
                                  <DescriptionListTerm>Pod Interface</DescriptionListTerm>
                                  <DescriptionListDescription>{netStatus.interface_name}</DescriptionListDescription>
                                </DescriptionListGroup>
                              )}
                            </>
                          )}
                          {iface.ports && iface.ports.length > 0 && (
                            <DescriptionListGroup>
                              <DescriptionListTerm>Ports</DescriptionListTerm>
                              <DescriptionListDescription>
                                {iface.ports.map(port => `${port.name || port.port} (${port.protocol})`).join(', ')}
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          )}
                        </DescriptionList>
                        {idx < vm.rawInterfaces.length - 1 && <Divider style={{ marginTop: '16px' }} />}
                      </div>
                    );
                  })}
                  {(!vm.rawInterfaces || vm.rawInterfaces.length === 0) && (
                    <p style={{ color: '#6a6e73' }}>No network interfaces configured</p>
                  )}
                </CardBody>
              </Card>
            </Tab>
            <Tab eventKey={4} title={<TabTitleText>Console</TabTitleText>}>
              <Card>
                <CardBody>
                  {vm.status === 'Running' ? (
                    <div>
                      <Title headingLevel="h3" size="lg">VNC Console</Title>
                      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <p style={{ marginBottom: '16px' }}>
                          To access the VNC console, use the <code>virtctl</code> command:
                        </p>
                        <pre style={{
                          backgroundColor: '#282c34',
                          color: '#abb2bf',
                          padding: '16px',
                          borderRadius: '4px',
                          overflow: 'auto'
                        }}>
                          virtctl vnc {vm.name} -n {vm.namespace}
                        </pre>
                        <p style={{ marginTop: '16px', fontSize: '0.875rem', color: '#6a6e73' }}>
                          Note: You need to have <code>virtctl</code> installed locally and kubectl access to the cluster.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Title headingLevel="h3" size="lg">Console Not Available</Title>
                      <p style={{ marginTop: '16px', color: '#6a6e73' }}>
                        The VNC console is only available when the VM is running. Current status: <strong>{vm.status}</strong>
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </GridItem>
      </Grid>
    </PageSection>
  );
}
