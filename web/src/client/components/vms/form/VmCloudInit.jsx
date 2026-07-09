import { FormGroup, TextArea, Button } from '@patternfly/react-core';
import { useEffect } from 'react';

const DEFAULT_CLOUD_INIT = `#cloud-config
users:
  - name: admin
    password: changeme
    chpasswd: { expire: false }
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: false`;

export default function VmCloudInit({ formData, onChange }) {
  useEffect(() => {
    // Set default cloud-init on first render if empty
    if (!formData.cloudInit) {
      onChange({ ...formData, cloudInit: DEFAULT_CLOUD_INIT });
    }
  }, []);

  const handleClear = () => {
    onChange({ ...formData, cloudInit: '' });
  };

  const handleReset = () => {
    onChange({ ...formData, cloudInit: DEFAULT_CLOUD_INIT });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FormGroup
        label="Cloud-Init User Data"
        helperText="YAML format cloud-init configuration. Default creates an 'admin' user with password 'changeme'. Edit as needed or clear to skip cloud-init."
      >
        <TextArea
          value={formData.cloudInit}
          onChange={(_event, value) => onChange({ ...formData, cloudInit: value })}
          rows={12}
        />
      </FormGroup>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="secondary" onClick={handleReset}>
          Reset to Default
        </Button>
        <Button variant="link" onClick={handleClear}>
          Clear (Skip Cloud-Init)
        </Button>
      </div>
    </div>
  );
}
