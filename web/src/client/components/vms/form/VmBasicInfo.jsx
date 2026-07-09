import { FormGroup, TextInput, Select, SelectOption, SelectList, MenuToggle } from '@patternfly/react-core';
import { useState } from 'react';

export default function VmBasicInfo({ formData, onChange, namespaces }) {
  const [isNamespaceOpen, setIsNamespaceOpen] = useState(false);

  const toggle = toggleRef => (
    <MenuToggle ref={toggleRef} onClick={() => setIsNamespaceOpen(!isNamespaceOpen)} isExpanded={isNamespaceOpen} style={{width: '100%'}}>
      {formData.namespace || 'Select namespace'}
    </MenuToggle>
  );

  return (
    <>
      <FormGroup label="Name" isRequired>
        <TextInput
          isRequired
          type="text"
          value={formData.name}
          onChange={(_event, value) => onChange({ ...formData, name: value })}
          placeholder="my-vm"
        />
      </FormGroup>

      <FormGroup label="Namespace" isRequired>
        <Select
          isOpen={isNamespaceOpen}
          onOpenChange={isOpen => setIsNamespaceOpen(isOpen)}
          toggle={toggle}
          onSelect={(_event, value) => {
            onChange({ ...formData, namespace: value });
            setIsNamespaceOpen(false);
          }}
          selected={formData.namespace}
        >
          <SelectList>
            {namespaces.map(ns => (
              <SelectOption key={ns} value={ns}>{ns}</SelectOption>
            ))}
          </SelectList>
        </Select>
      </FormGroup>

      <FormGroup label="Operating System" helperText="Optional OS identifier">
        <TextInput
          type="text"
          value={formData.os}
          onChange={(_event, value) => onChange({ ...formData, os: value })}
          placeholder="fedora40"
        />
      </FormGroup>
    </>
  );
}
