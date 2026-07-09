import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageSection,
  Form,
  FormSection,
  Button,
  ButtonVariant,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Panel,
  PanelMain,
  PanelMainBody,
} from '@patternfly/react-core';
import { vmCreateFormAtom, vmnamespacesAtom, storagesAtom, getVmnamespaces, getStorages } from '../../utils/store.js';
import { createVm } from '../../utils/api.js';
import VmBasicInfo from './form/VmBasicInfo.jsx';
import VmHardware from './form/VmHardware.jsx';
import VmStorage from './form/VmStorage.jsx';
import VmNetwork from './form/VmNetwork.jsx';
import VmCloudInit from './form/VmCloudInit.jsx';
import VmAdvanced from './form/VmAdvanced.jsx';

export default function VmCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useAtom(vmCreateFormAtom);
  const [namespaces, setNamespaces] = useAtom(vmnamespacesAtom);
  const [dataVolumes, setDataVolumes] = useAtom(storagesAtom);
  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedNamespaces = await getVmnamespaces();
      setNamespaces(fetchedNamespaces);

      const fetchedStorages = await getStorages();
      setDataVolumes(fetchedStorages);
    };
    fetchData();
  }, []);

  const validateForm = () => {
    if (!formData.name) return 'VM name is required';
    if (!formData.namespace) return 'Namespace is required';
    if (formData.cpu <= 0) return 'CPU cores must be greater than 0';
    if (!formData.memory) return 'Memory is required';
    if (!formData.memory.match(/^\d+(Mi|Gi|M|G)$/)) return 'Memory format invalid (e.g., "2Gi", "512Mi")';
    if (!formData.disks || formData.disks.length === 0) return 'At least one disk is required';

    for (let i = 0; i < formData.disks.length; i++) {
      const disk = formData.disks[i];
      if (!disk.name) return `Disk ${i + 1} name is required`;
      if (disk.source === 'existing' && !disk.dataVolumeName) {
        return `Disk ${i + 1} requires a DataVolume selection`;
      }
      if (disk.source === 'new' && !disk.imageUrl) {
        return `Disk ${i + 1} requires an image URL`;
      }
      if (disk.source === 'new' && !disk.size) {
        return `Disk ${i + 1} requires a size`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const validationError = validateForm();
    if (validationError) {
      setAlert({ type: 'danger', message: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createVm(formData);

      if (result.status === 'error') {
        setAlert({ type: 'danger', message: `Failed to create VM: ${result.message}` });
        setIsSubmitting(false);
      } else {
        navigate('/vms', {
          state: { alert: { type: 'success', message: `VM "${formData.name}" created successfully` } }
        });
      }
    } catch (error) {
      setAlert({ type: 'danger', message: `Error: ${error.message}` });
      setIsSubmitting(false);
    }
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <BreadcrumbItem to="/vms">Virtual Machines</BreadcrumbItem>
        <BreadcrumbItem isActive>Create VM</BreadcrumbItem>
      </Breadcrumb>

      <h1 style={{ marginBottom: '24px' }}>Create Virtual Machine</h1>

      {alert && (
        <Alert
          variant={alert.type}
          title={alert.message}
          isInline
          style={{ marginBottom: '16px' }}
          actionClose={<Button variant="plain" onClick={() => setAlert(null)}>×</Button>}
        />
      )}

      <Panel>
        <PanelMain>
          <PanelMainBody>
            <Form onSubmit={handleSubmit}>
              <FormSection title="Basic Information" titleElement="h2">
                <VmBasicInfo
                  formData={formData}
                  onChange={setFormData}
                  namespaces={namespaces}
                />
              </FormSection>

              <FormSection title="Hardware Configuration" titleElement="h2">
                <VmHardware formData={formData} onChange={setFormData} />
              </FormSection>

              <FormSection title="Storage" titleElement="h2">
                <VmStorage
                  formData={formData}
                  onChange={setFormData}
                  dataVolumes={dataVolumes}
                />
              </FormSection>

              <FormSection title="Network" titleElement="h2">
                <VmNetwork formData={formData} onChange={setFormData} />
              </FormSection>

              <FormSection title="Cloud-Init" titleElement="h2">
                <VmCloudInit formData={formData} onChange={setFormData} />
              </FormSection>

              <FormSection title="Advanced Settings" titleElement="h2">
                <VmAdvanced formData={formData} onChange={setFormData} />
              </FormSection>

              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <Button variant={ButtonVariant.primary} type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create VM'}
                </Button>
                <Button variant={ButtonVariant.link} onClick={() => navigate('/vms')}>
                  Cancel
                </Button>
              </div>
            </Form>
          </PanelMainBody>
        </PanelMain>
      </Panel>
    </PageSection>
  );
}
