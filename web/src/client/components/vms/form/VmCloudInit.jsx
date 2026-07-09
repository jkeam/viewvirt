import { FormGroup, TextArea } from '@patternfly/react-core';

export default function VmCloudInit({ formData, onChange }) {
  return (
    <FormGroup
      label="Cloud-Init User Data"
      helperText="YAML format cloud-init configuration (optional)"
    >
      <TextArea
        value={formData.cloudInit}
        onChange={(_event, value) => onChange({ ...formData, cloudInit: value })}
        placeholder={`#cloud-config
users:
  - name: fedora
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAA...`}
        rows={10}
      />
    </FormGroup>
  );
}
