import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageSection,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Panel,
  PanelMain,
  PanelMainBody,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import BasicTable from '../common/BasicTable';
import { getNetworks, networksAtom, getVmnamespaces, vmnamespacesAtom } from '../../utils/store.js'

export default function Network() {
  const { namespace: urlNamespace } = useParams();
  const navigate = useNavigate();
  const [interfaces, setInterfaces] = useAtom(networksAtom);
  const [vmnamespaces, setVmnamespaces] = useAtom(vmnamespacesAtom);
  const [filteredInterfaces, setFilteredInterfaces] = useState([]);
  const [isNamespaceSelectOpen, setNamespaceSelectIsOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState(urlNamespace || 'All Namespaces');

  useEffect(() => {
    const fetchData = async () => {
      const fetched = await getNetworks();
      setInterfaces(fetched);
      if (selectedNamespace === 'All Namespaces') {
        setFilteredInterfaces(fetched);
      } else {
        setFilteredInterfaces(fetched.filter(n => n.namespace === selectedNamespace));
      }
      const fetchVmnamespaces = await getVmnamespaces();
      setVmnamespaces(fetchVmnamespaces);
    };

    // Initial fetch
    fetchData();

    // Poll every 10 seconds to update network data
    const interval = setInterval(fetchData, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedNamespace]);

  // Update filtered interfaces when URL namespace changes
  useEffect(() => {
    if (urlNamespace && interfaces.length > 0) {
      setSelectedNamespace(urlNamespace);
      setFilteredInterfaces(interfaces.filter(n => n.namespace === urlNamespace));
    }
  }, [urlNamespace, interfaces]);

  const onToggleClick = () => {
    setNamespaceSelectIsOpen(!isNamespaceSelectOpen);
  };

  const onSelect = (_event, value) => {
    setSelectedNamespace(value);
    if (value === 'All Namespaces') {
      setFilteredInterfaces(interfaces);
      navigate('/networks');
    } else {
      setFilteredInterfaces(interfaces.filter(n => n.namespace === value));
      navigate(`/networks/ns/${value}`);
    }
    setNamespaceSelectIsOpen(false);
  };

  const toggle = toggleRef => (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isNamespaceSelectOpen} style={{width: '200px'}}>
      {selectedNamespace}
    </MenuToggle>
  );

  const cols = ['VM Name', 'Iface Name', 'IPs', 'MAC', 'Network', 'Network Name', 'Network Type', 'Iface Model'];
  const rows = (item) => {
    return [
      item.vmName,
      item.interfaceName,
      (item.ipAddresses || []).join(', '),
      item.macAddress,
      item.bridge?.name || item.masquerade?.name || 'Pod Network',
      item.name,
      item.bridge ? 'Bridge' : item.masquerade ? 'Masquerade' : item.sriov ? 'SR-IOV' : 'N/A',
      item.model,
    ];
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Panel>
        <PanelMain>
          <PanelMainBody>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
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
              </FlexItem>
            </Flex>
          </PanelMainBody>
        </PanelMain>
      </Panel>
      { filteredInterfaces.length > 0 && <BasicTable caption="Networks in selected namespace" data={filteredInterfaces} rows={rows} cols={cols} /> }
    </PageSection>
  );
}
