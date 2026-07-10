import { FormGroup, NumberInput, Button, ButtonVariant } from '@patternfly/react-core';
import { useState } from 'react';

const PRESETS = [
  { name: 'Small', cpu: 1, memory: 2, description: 'Good for testing' },
  { name: 'Medium', cpu: 2, memory: 4, description: 'Good for development' },
  { name: 'Large', cpu: 4, memory: 8, description: 'Good for production' },
];

export default function VmHardware({ formData, onChange }) {
  const [selectedPreset, setSelectedPreset] = useState('Medium');
  const [isCustom, setIsCustom] = useState(false);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.name);
    setIsCustom(false);
    onChange({ ...formData, cpu: preset.cpu, memory: preset.memory });
  };

  const handleManualChange = () => {
    setIsCustom(true);
    setSelectedPreset('');
  };

  return (
    <>
      <FormGroup label="Hardware Configuration">
        <div style={{ marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6a6e73' }}>
            Choose a preset or configure custom hardware:
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant={selectedPreset === preset.name ? ButtonVariant.primary : ButtonVariant.secondary}
                onClick={() => applyPreset(preset)}
                style={{ minWidth: '120px' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>{preset.name}</div>
                  <div style={{ fontSize: '12px' }}>{preset.cpu} CPU / {preset.memory}Gi</div>
                  <div style={{ fontSize: '11px', fontStyle: 'italic' }}>{preset.description}</div>
                </div>
              </Button>
            ))}
            <Button
              variant={isCustom ? ButtonVariant.primary : ButtonVariant.secondary}
              onClick={handleManualChange}
              style={{ minWidth: '120px' }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>Custom</div>
                <div style={{ fontSize: '12px' }}>Manual entry</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic' }}>Advanced</div>
              </div>
            </Button>
          </div>
        </div>
      </FormGroup>

      {isCustom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormGroup label="CPU Cores" isRequired>
            <NumberInput
              value={formData.cpu}
              min={1}
              max={128}
              onMinus={() => onChange({ ...formData, cpu: Math.max(1, formData.cpu - 1) })}
              onPlus={() => onChange({ ...formData, cpu: formData.cpu + 1 })}
              onChange={(event) => {
                const value = parseInt(event.target.value) || 1;
                onChange({ ...formData, cpu: Math.max(1, value) });
              }}
            />
          </FormGroup>

          <FormGroup
            label="Memory (Gi)"
            isRequired
            helperText="Memory in Gibibytes (Gi)"
          >
            <NumberInput
              value={formData.memory}
              min={1}
              max={512}
              onMinus={() => onChange({ ...formData, memory: Math.max(1, formData.memory - 1) })}
              onPlus={() => onChange({ ...formData, memory: formData.memory + 1 })}
              onChange={(event) => {
                const value = parseInt(event.target.value) || 1;
                onChange({ ...formData, memory: Math.max(1, value) });
              }}
            />
          </FormGroup>
        </div>
      )}

      {!isCustom && (
        <div style={{ padding: '12px', border: '1px solid var(--pf-v5-global--BorderColor--100)', borderRadius: '4px' }}>
          <strong>Selected:</strong> {formData.cpu} CPU cores, {formData.memory}Gi memory
        </div>
      )}
    </>
  );
}
