import { FormGroup, Radio } from '@patternfly/react-core';

export default function VmAdvanced({ formData, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <FormGroup label="Run Strategy" helperText="Determines VM lifecycle behavior">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Radio
            label="Manual - Controlled by start/stop actions"
            name="runStrategy"
            id="manual"
            isChecked={formData.runStrategy === 'Manual'}
            onChange={() => onChange({ ...formData, runStrategy: 'Manual' })}
          />
          <Radio
            label="Always - Auto-start and keep running"
            name="runStrategy"
            id="always"
            isChecked={formData.runStrategy === 'Always'}
            onChange={() => onChange({ ...formData, runStrategy: 'Always' })}
          />
          <Radio
            label="Halted - Created in stopped state"
            name="runStrategy"
            id="halted"
            isChecked={formData.runStrategy === 'Halted'}
            onChange={() => onChange({ ...formData, runStrategy: 'Halted' })}
          />
        </div>
      </FormGroup>
    </div>
  );
}
