import { FormGroup, TextInput, NumberInput } from '@patternfly/react-core';

export default function VmHardware({ formData, onChange }) {
  return (
    <>
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
        label="Memory"
        isRequired
        helperText='Format: "2Gi", "512Mi", "4G"'
      >
        <TextInput
          isRequired
          type="text"
          value={formData.memory}
          onChange={(_event, value) => onChange({ ...formData, memory: value })}
          placeholder="2Gi"
        />
      </FormGroup>
    </>
  );
}
