import { FormGroup, TextInput, NumberInput, Radio, Select, SelectOption, SelectList, MenuToggle, Button } from '@patternfly/react-core';
import { PlusIcon, MinusIcon } from '@patternfly/react-icons';
import { useState } from 'react';

export default function VmStorage({ formData, onChange, dataVolumes }) {
  const [openSelects, setOpenSelects] = useState({});

  const toggleSelect = (idx) => {
    setOpenSelects(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const createToggle = (idx) => (toggleRef) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => toggleSelect(idx)}
      isExpanded={openSelects[idx] || false}
      style={{width: '100%'}}
    >
      {formData.disks[idx]?.dataVolumeName || 'Select DataVolume'}
    </MenuToggle>
  );

  const addDisk = () => {
    const newDisks = [...formData.disks, {
      name: `disk${formData.disks.length}`,
      source: 'existing',
      dataVolumeName: '',
      imageUrl: '',
      size: '10Gi',
      bootOrder: 0
    }];
    onChange({ ...formData, disks: newDisks });
  };

  const removeDisk = (idx) => {
    if (formData.disks.length > 1) {
      const newDisks = formData.disks.filter((_, i) => i !== idx);
      onChange({ ...formData, disks: newDisks });
    }
  };

  const updateDisk = (idx, field, value) => {
    const newDisks = [...formData.disks];
    newDisks[idx] = { ...newDisks[idx], [field]: value };
    onChange({ ...formData, disks: newDisks });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {formData.disks.map((disk, idx) => (
        <div key={idx} style={{ padding: '16px', border: '1px solid var(--pf-v5-global--BorderColor--100)', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>Disk {idx + 1}</h3>
            {formData.disks.length > 1 && (
              <Button variant="danger" icon={<MinusIcon />} onClick={() => removeDisk(idx)} size="sm">
                Remove
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FormGroup label="Disk Name" isRequired>
              <TextInput
                type="text"
                value={disk.name}
                onChange={(_event, value) => updateDisk(idx, 'name', value)}
                placeholder={`disk${idx}`}
              />
            </FormGroup>

            <FormGroup label="Source Type">
              <Radio
                label="Use Existing DataVolume"
                name={`source-${idx}`}
                id={`existing-${idx}`}
                isChecked={disk.source === 'existing'}
                onChange={() => updateDisk(idx, 'source', 'existing')}
              />
              <Radio
                label="Create from Image URL"
                name={`source-${idx}`}
                id={`new-${idx}`}
                isChecked={disk.source === 'new'}
                onChange={() => updateDisk(idx, 'source', 'new')}
              />
            </FormGroup>

            {disk.source === 'existing' && (
              <FormGroup label="DataVolume" isRequired>
                <Select
                  isOpen={openSelects[idx] || false}
                  onOpenChange={(isOpen) => setOpenSelects(prev => ({ ...prev, [idx]: isOpen }))}
                  toggle={createToggle(idx)}
                  onSelect={(_event, value) => {
                    updateDisk(idx, 'dataVolumeName', value);
                    setOpenSelects(prev => ({ ...prev, [idx]: false }));
                  }}
                  selected={disk.dataVolumeName}
                >
                  <SelectList>
                    {dataVolumes.map(dv => (
                      <SelectOption key={dv.name} value={dv.name}>
                        {dv.name} ({dv.namespace})
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </FormGroup>
            )}

            {disk.source === 'new' && (
              <>
                <FormGroup label="Container Image URL" isRequired helperText="e.g., quay.io/containerdisks/fedora:40">
                  <TextInput
                    type="text"
                    value={disk.imageUrl}
                    onChange={(_event, value) => updateDisk(idx, 'imageUrl', value)}
                    placeholder="quay.io/containerdisks/fedora:40"
                  />
                </FormGroup>
                <FormGroup label="Disk Size" isRequired helperText='e.g., "10Gi", "20Gi"'>
                  <TextInput
                    type="text"
                    value={disk.size}
                    onChange={(_event, value) => updateDisk(idx, 'size', value)}
                    placeholder="10Gi"
                  />
                </FormGroup>
              </>
            )}

            <FormGroup label="Boot Order" helperText="0 = not bootable, 1+ = boot priority">
              <NumberInput
                value={disk.bootOrder}
                min={0}
                max={10}
                onMinus={() => updateDisk(idx, 'bootOrder', Math.max(0, disk.bootOrder - 1))}
                onPlus={() => updateDisk(idx, 'bootOrder', disk.bootOrder + 1)}
                onChange={(event) => {
                  const value = parseInt(event.target.value) || 0;
                  updateDisk(idx, 'bootOrder', Math.max(0, value));
                }}
              />
            </FormGroup>
          </div>
        </div>
      ))}

      <Button variant="secondary" icon={<PlusIcon />} onClick={addDisk}>
        Add Disk
      </Button>
    </div>
  );
}
