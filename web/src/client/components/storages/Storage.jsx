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
import { getStorages, storagesAtom } from '../../utils/store.js'

export default function Storage() {
  const { namespace: urlNamespace } = useParams();
  const navigate = useNavigate();
  const [storages, setStorages] = useAtom(storagesAtom);
  const [storageNamespaces, setStorageNamespaces] = useState([]);
  const [filteredStorages, setFilteredStorages] = useState([]);
  const [isNamespaceSelectOpen, setNamespaceSelectIsOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState(urlNamespace || 'All Namespaces');

  useEffect(() => {
    const fetchData = async () => {
      const fetched = await getStorages();
      setStorages(fetched);
      if (selectedNamespace === 'All Namespaces') {
        setFilteredStorages(fetched);
      } else {
        setFilteredStorages(fetched.filter(s => s.namespace === selectedNamespace));
      }
      // Extract unique namespaces from storage objects
      const uniqueNamespaces = [...new Set(fetched.map(s => s.namespace).filter(Boolean))].sort();
      setStorageNamespaces(uniqueNamespaces);
    };

    // Initial fetch
    fetchData();

    // Poll every 10 seconds to update storage data
    const interval = setInterval(fetchData, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedNamespace]);

  // Update filtered storages when URL namespace changes
  useEffect(() => {
    if (urlNamespace && storages.length > 0) {
      setSelectedNamespace(urlNamespace);
      setFilteredStorages(storages.filter(s => s.namespace === urlNamespace));
    }
  }, [urlNamespace, storages]);

  const onToggleClick = () => {
    setNamespaceSelectIsOpen(!isNamespaceSelectOpen);
  };

  const onSelect = (_event, value) => {
    setSelectedNamespace(value);
    if (value === 'All Namespaces') {
      setFilteredStorages(storages);
      navigate('/storages');
    } else {
      setFilteredStorages(storages.filter(s => s.namespace === value));
      navigate(`/storages/ns/${value}`);
    }
    setNamespaceSelectIsOpen(false);
  };

  const toggle = toggleRef => (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isNamespaceSelectOpen} style={{width: '200px'}}>
      {selectedNamespace}
    </MenuToggle>
  );

  const cols = ['Name', 'VM', 'Type', 'Source', 'Size'];
  const rows = (item) => {
    return [
      item.name,
      item.vm,
      item.type,
      item.source,
      item.storage
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
                    {storageNamespaces.map(v => <SelectOption value={v} key={v}>{v}</SelectOption>)}
                  </SelectList>
                </Select>
              </FlexItem>
            </Flex>
          </PanelMainBody>
        </PanelMain>
      </Panel>
      { filteredStorages.length > 0 && <BasicTable caption="Storage in selected namespace" data={filteredStorages} rows={rows} cols={cols} /> }
    </PageSection>
  );
}
