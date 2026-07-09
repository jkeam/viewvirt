import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Dropdown,
  DropdownList,
  DropdownItem,
} from '@patternfly/react-core';
import {
  PlayIcon,
  StopIcon,
  RedoIcon,
  PlusIcon,
  EllipsisVIcon,
} from '@patternfly/react-icons';
import BasicTable from '../common/BasicTable';
import { getVms, vmsAtom, getVmnamespaces, vmnamespacesAtom } from '../../utils/store.js';
import { startVm, stopVm, restartVm } from '../../utils/api.js';

export default function Vm() {
  const { namespace: urlNamespace } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [vms, setVms] = useAtom(vmsAtom);
  const [vmnamespaces, setVmnamespaces] = useAtom(vmnamespacesAtom);
  const [filteredVms, setFilteredVms] = useState([]);
  const [isNamespaceSelectOpen, setNamespaceSelectIsOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState(urlNamespace || 'All Namespaces');
  const [alert, setAlert] = useState(location.state?.alert || null);
  const [operatingVm, setOperatingVm] = useState(null);
  const [openKebabs, setOpenKebabs] = useState({});
  useEffect(() => {
    const fetchData = async () => {
      const fetched = await getVms();
      setVms(fetched);
      if (selectedNamespace === 'All Namespaces') {
        setFilteredVms(fetched);
      } else {
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

  // Update filtered VMs when URL namespace changes
  useEffect(() => {
    if (urlNamespace && vms.length > 0) {
      setSelectedNamespace(urlNamespace);
      setFilteredVms(vms.filter(v => v.namespace === urlNamespace));
    }
  }, [urlNamespace, vms]);

  const onToggleClick = () => {
    setNamespaceSelectIsOpen(!isNamespaceSelectOpen);
  };

  const onSelect = (_event, value) => {
    setSelectedNamespace(value);
    if (value === 'All Namespaces') {
      setFilteredVms(vms);
      navigate('/vms');
    } else {
      setFilteredVms(vms.filter(v => v.namespace === value));
      navigate(`/vms/ns/${value}`);
    }
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
        setOperatingVm(null);
      } else {
        setAlert({ type: 'success', message: `VM ${action} command sent successfully` });
        // Immediate refresh after action
        const fetched = await getVms();
        setVms(fetched);
        if (selectedNamespace === 'All Namespaces') {
          setFilteredVms(fetched);
        } else {
          setFilteredVms(fetched.filter(v => v.namespace === selectedNamespace));
        }
        // Keep operatingVm set until status reflects the change
        // This prevents double-clicks during the brief moment before the API updates
        setTimeout(() => setOperatingVm(null), 2000);
      }
    } catch (error) {
      setAlert({ type: 'danger', message: `Error: ${error.message}` });
      setOperatingVm(null);
    }
  };

  const toggleKebab = (vmName, isOpen) => {
    setOpenKebabs(prev => ({
      ...prev,
      [vmName]: isOpen
    }));
  };

  const cols = ['Name', 'Status', 'OS', 'CPUs', 'Memory', 'Storage', 'Network', 'Node', 'Actions'];
  const rows = (item) => {
    const isOperating = operatingVm === item.name;
    const statusColor = item.status === 'Running' ? 'green' : item.status === 'Stopped' ? 'grey' : 'orange';

    // Intelligent button states based on VM status
    // Disable start if: operating, running, pending, scheduling, or any starting state
    const runningStates = ['Running', 'Pending', 'Scheduling', 'Scheduled', 'Starting', 'Provisioning'];
    const stoppingStates = ['Stopping', 'Succeeded'];
    const canStart = !isOperating && !runningStates.includes(item.status) && !stoppingStates.includes(item.status);
    // Allow stop if Running OR in any pending/starting state (to cancel startup), but not if already stopping
    const canStop = !isOperating && runningStates.includes(item.status) && !stoppingStates.includes(item.status);
    const canRestart = !isOperating && item.status === 'Running';

    const kebabId = `kebab-${item.namespace}-${item.name}`;
    const isKebabOpen = openKebabs[kebabId] || false;

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
      item.node,
      <Dropdown
        key={`actions-${item.name}`}
        isOpen={isKebabOpen}
        onOpenChange={(isOpen) => toggleKebab(kebabId, isOpen)}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={() => toggleKebab(kebabId, !isKebabOpen)}
            isExpanded={isKebabOpen}
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem
            key="start"
            icon={<PlayIcon />}
            onClick={() => {
              toggleKebab(kebabId, false);
              handleVmAction('start', item.namespace, item.name);
            }}
            isDisabled={!canStart}
          >
            Start
          </DropdownItem>
          <DropdownItem
            key="stop"
            icon={<StopIcon />}
            onClick={() => {
              toggleKebab(kebabId, false);
              handleVmAction('stop', item.namespace, item.name);
            }}
            isDisabled={!canStop}
          >
            Stop
          </DropdownItem>
          <DropdownItem
            key="restart"
            icon={<RedoIcon />}
            onClick={() => {
              toggleKebab(kebabId, false);
              handleVmAction('restart', item.namespace, item.name);
            }}
            isDisabled={!canRestart}
          >
            Restart
          </DropdownItem>
        </DropdownList>
      </Dropdown>,
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
      <Toolbar style={{ marginBottom: '16px' }}>
        <ToolbarContent>
          <ToolbarItem>
            <Button variant={ButtonVariant.primary} icon={<PlusIcon />} onClick={() => navigate('/vms/create')}>
              Create VM
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
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
                <SelectOption value="All Namespaces" key="all-namespaces">All Namespaces</SelectOption>
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
