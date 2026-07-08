import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PageSection,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Panel,
  PanelMain,
  PanelMainBody,
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Alert,
  Label,
} from '@patternfly/react-core';
import {
  PlayIcon,
  StopIcon,
  RedoIcon,
} from '@patternfly/react-icons';
import BasicTable from '../common/BasicTable';
import { getVms, vmsAtom, getVmnamespaces, vmnamespacesAtom } from '../../utils/store.js';
import { startVm, stopVm, restartVm } from '../../utils/api.js';

export default function Vm() {
  const [vms, setVms] = useAtom(vmsAtom);
  const [vmnamespaces, setVmnamespaces] = useAtom(vmnamespacesAtom);
  const [filteredVms, setFilteredVms] = useState([]);
  const [isNamespaceSelectOpen, setNamespaceSelectIsOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState('Select namespace');
  const [alert, setAlert] = useState(null);
  const [operatingVm, setOperatingVm] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      const fetched = await getVms();
      setVms(fetched);
      if (selectedNamespace !== 'Select namespace') {
        setFilteredVms(fetched.filter(v => v.namespace === selectedNamespace));
      }
      const fetchVmnamespaces = await getVmnamespaces();
      setVmnamespaces(fetchVmnamespaces);
    };

    // Initial fetch
    fetchData();

    // Poll every 10 seconds to update VM status
    const interval = setInterval(fetchData, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedNamespace]);

  const onToggleClick = () => {
    setNamespaceSelectIsOpen(!isNamespaceSelectOpen);
  };

  const onSelect = (_event, value) => {
    setSelectedNamespace(value);
    setFilteredVms(vms.filter(v => v.namespace === value));
    setNamespaceSelectIsOpen(false);
  };

  const toggle = toggleRef => (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isNamespaceSelectOpen} style={{width: '200px'}}>
      {selectedNamespace}
    </MenuToggle>
  );

  const handleVmAction = async (action, namespace, name) => {
    setOperatingVm(name);
    setAlert(null);
    try {
      let result;
      if (action === 'start') {
        result = await startVm(namespace, name);
      } else if (action === 'stop') {
        result = await stopVm(namespace, name);
      } else if (action === 'restart') {
        result = await restartVm(namespace, name);
      }

      if (result.status === 'error') {
        setAlert({ type: 'danger', message: `Failed to ${action} VM: ${result.message}` });
      } else {
        setAlert({ type: 'success', message: `VM ${action} command sent successfully` });
        // Immediate refresh after action, then polling will continue updates
        const fetched = await getVms();
        setVms(fetched);
        if (selectedNamespace !== 'Select namespace') {
          setFilteredVms(fetched.filter(v => v.namespace === selectedNamespace));
        }
      }
    } catch (error) {
      setAlert({ type: 'danger', message: `Error: ${error.message}` });
    } finally {
      setOperatingVm(null);
    }
  };

  const cols = ['Name', 'Status', 'OS', 'CPUs', 'Memory', 'Storage', 'Network', 'Actions'];
  const rows = (item) => {
    const isOperating = operatingVm === item.name;
    const statusColor = item.status === 'Running' ? 'green' : item.status === 'Stopped' ? 'grey' : 'orange';
    return [
      <Link to={`/vms/${item.namespace}/${item.name}`} key={`link-${item.name}`} style={{ color: '#06c', textDecoration: 'none' }}>
        {item.name}
      </Link>,
      <Label color={statusColor} key={`status-${item.name}`}>
        {item.status}
      </Label>,
      item.os,
      item.cpu,
      item.memory,
      item.dataVolumes,
      item.interfaces,
      <Flex spaceItems={{ default: 'spaceItemsXs' }} key={`actions-${item.name}`}>
        <FlexItem>
          <Button
            variant={ButtonVariant.primary}
            icon={<PlayIcon />}
            onClick={() => handleVmAction('start', item.namespace, item.name)}
            isDisabled={isOperating || item.status === 'Running'}
            size="sm"
          >
            Start
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant={ButtonVariant.danger}
            icon={<StopIcon />}
            onClick={() => handleVmAction('stop', item.namespace, item.name)}
            isDisabled={isOperating || item.status !== 'Running'}
            size="sm"
          >
            Stop
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant={ButtonVariant.secondary}
            icon={<RedoIcon />}
            onClick={() => handleVmAction('restart', item.namespace, item.name)}
            isDisabled={isOperating || item.status !== 'Running'}
            size="sm"
          >
            Restart
          </Button>
        </FlexItem>
      </Flex>,
    ];
  };

  return (
    <PageSection hasBodyWrapper={false}>
      {alert && (
        <Alert
          variant={alert.type}
          title={alert.message}
          isInline
          style={{ marginBottom: '16px' }}
          actionClose={<Button variant="plain" onClick={() => setAlert(null)}>×</Button>}
        />
      )}
      <Panel>
        <PanelMain>
          <PanelMainBody>
            Namespace: &nbsp;
            <Select
              isOpen={isNamespaceSelectOpen}
              onOpenChange={isOpen => setNamespaceSelectIsOpen(isOpen)}
              toggle={toggle}
              onSelect={onSelect}
              selected={selectedNamespace}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {vmnamespaces.map(v => <SelectOption value={v} key={v}>{v}</SelectOption>)}
              </SelectList>
            </Select>
          </PanelMainBody>
        </PanelMain>
      </Panel>
      { filteredVms.length > 0 && <BasicTable caption="VMs in selected namespace" data={filteredVms} rows={rows} cols={cols} /> }
    </PageSection>
  );
}
