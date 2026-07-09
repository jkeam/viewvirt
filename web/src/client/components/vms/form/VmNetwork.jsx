import { FormGroup, TextInput, Radio, Button } from '@patternfly/react-core';
import { PlusIcon, MinusIcon } from '@patternfly/react-icons';

export default function VmNetwork({ formData, onChange }) {
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

  return (
    <>
      {formData.networks.map((network, idx) => (
        <div key={idx} style={{ marginBottom: '24px', padding: '16px', border: '1px solid #d2d2d2', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Network {idx + 1}</h3>
            {formData.networks.length > 1 && (
              <Button variant="danger" icon={<MinusIcon />} onClick={() => removeNetwork(idx)} size="sm">
                Remove
              </Button>
            )}
          </div>

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

          <FormGroup label="Interface Model">
            <TextInput
              type="text"
              value={network.model}
              onChange={(_event, value) => updateNetwork(idx, 'model', value)}
              placeholder="virtio"
            />
          </FormGroup>
        </div>
      ))}

      <Button variant="secondary" icon={<PlusIcon />} onClick={addNetwork}>
        Add Network
      </Button>
    </>
  );
}
