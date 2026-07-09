import { FormGroup, TextInput, Radio, Button, Panel, PanelMain, PanelMainBody, ExpandableSection, Select, SelectOption, SelectList, MenuToggle } from '@patternfly/react-core';
import { PlusIcon, MinusIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { useState } from 'react';

export default function VmNetwork({ formData, onChange }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openModelSelects, setOpenModelSelects] = useState({});

  const addNetwork = () => {
    const newNetworks = [...formData.networks, {
      name: `net${formData.networks.length}`,
      type: 'pod',
      model: 'virtio',
      multusNetwork: ''
    }];
    onChange({ ...formData, networks: newNetworks });
  };

  const removeNetwork = (idx) => {
    if (formData.networks.length > 1) {
      const newNetworks = formData.networks.filter((_, i) => i !== idx);
      onChange({ ...formData, networks: newNetworks });
    }
  };

  const updateNetwork = (idx, field, value) => {
    const newNetworks = [...formData.networks];
    newNetworks[idx] = { ...newNetworks[idx], [field]: value };
    onChange({ ...formData, networks: newNetworks });
  };

  const createModelToggle = (idx) => (toggleRef) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setOpenModelSelects(prev => ({ ...prev, [idx]: !prev[idx] }))}
      isExpanded={openModelSelects[idx] || false}
      style={{width: '100%'}}
    >
      {formData.networks[idx]?.model || 'virtio'}
    </MenuToggle>
  );

  const hasOnlyDefaultPodNetwork =
    formData.networks.length === 1 &&
    formData.networks[0].type === 'pod' &&
    formData.networks[0].name === 'default';

  return (
    <>
      <Panel style={{ marginBottom: '16px', border: '1px solid var(--pf-v5-global--info-color--100)' }}>
        <PanelMain>
          <PanelMainBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircleIcon color="var(--pf-v5-global--info-color--100)" size="md" />
              <div>
                <strong>Default Pod Network</strong>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Your VM will be connected to the default pod network. This is suitable for most use cases.
                </p>
              </div>
            </div>
          </PanelMainBody>
        </PanelMain>
      </Panel>

      <ExpandableSection
        toggleText={showAdvanced ? "Hide advanced network options" : "Show advanced network options"}
        onToggle={() => setShowAdvanced(!showAdvanced)}
        isExpanded={showAdvanced}
      >
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6a6e73' }}>
            Advanced users can add additional networks or configure Multus networking.
          </p>

          {formData.networks.map((network, idx) => (
            <div key={idx} style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--pf-v5-global--BorderColor--100)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Network {idx + 1}</h3>
                {formData.networks.length > 1 && (
                  <Button variant="danger" icon={<MinusIcon />} onClick={() => removeNetwork(idx)} size="sm">
                    Remove
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FormGroup label="Network Name" isRequired>
                  <TextInput
                    type="text"
                    value={network.name}
                    onChange={(_event, value) => updateNetwork(idx, 'name', value)}
                    placeholder={`net${idx}`}
                  />
                </FormGroup>

                <FormGroup label="Network Type">
                  <Radio
                    label="Pod Network (Default)"
                    name={`type-${idx}`}
                    id={`pod-${idx}`}
                    isChecked={network.type === 'pod'}
                    onChange={() => updateNetwork(idx, 'type', 'pod')}
                  />
                  <Radio
                    label="Multus Network"
                    name={`type-${idx}`}
                    id={`multus-${idx}`}
                    isChecked={network.type === 'multus'}
                    onChange={() => updateNetwork(idx, 'type', 'multus')}
                  />
                </FormGroup>

                {network.type === 'multus' && (
                  <FormGroup label="Multus Network Name" isRequired>
                    <TextInput
                      type="text"
                      value={network.multusNetwork}
                      onChange={(_event, value) => updateNetwork(idx, 'multusNetwork', value)}
                      placeholder="my-multus-network"
                    />
                  </FormGroup>
                )}

                <FormGroup
                  label="Interface Model"
                  helperText="virtio is recommended for best performance. Use e1000e for compatibility with older guest operating systems."
                >
                  <Select
                    isOpen={openModelSelects[idx] || false}
                    onOpenChange={(isOpen) => setOpenModelSelects(prev => ({ ...prev, [idx]: isOpen }))}
                    toggle={createModelToggle(idx)}
                    onSelect={(_event, value) => {
                      updateNetwork(idx, 'model', value);
                      setOpenModelSelects(prev => ({ ...prev, [idx]: false }));
                    }}
                    selected={network.model}
                  >
                    <SelectList>
                      <SelectOption value="virtio">
                        <div>
                          <div>virtio (Recommended)</div>
                          <div style={{ fontSize: '12px', color: 'var(--pf-v5-global--Color--200)' }}>
                            Paravirtualized driver for best performance
                          </div>
                        </div>
                      </SelectOption>
                      <SelectOption value="e1000e">
                        <div>
                          <div>e1000e</div>
                          <div style={{ fontSize: '12px', color: 'var(--pf-v5-global--Color--200)' }}>
                            Intel emulated NIC for compatibility
                          </div>
                        </div>
                      </SelectOption>
                    </SelectList>
                  </Select>
                </FormGroup>
              </div>
            </div>
          ))}

          <Button variant="secondary" icon={<PlusIcon />} onClick={addNetwork}>
            Add Another Network
          </Button>
        </div>
      </ExpandableSection>
    </>
  );
}
