import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageSection,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { vmCreateFormAtom, vmnamespacesAtom, storagesAtom, datasourcesAtom, getVmnamespaces, getStorages, getDatasources } from '../../utils/store.js';
import { createVm } from '../../utils/api.js';
import VmBasicInfo from './form/VmBasicInfo.jsx';
import VmHardware from './form/VmHardware.jsx';
import VmStorage from './form/VmStorage.jsx';
import VmNetwork from './form/VmNetwork.jsx';
import VmCloudInit from './form/VmCloudInit.jsx';
import VmAdvanced from './form/VmAdvanced.jsx';
import VmReview from './form/VmReview.jsx';

export default function VmCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useAtom(vmCreateFormAtom);
  const [namespaces, setNamespaces] = useAtom(vmnamespacesAtom);
  const [dataVolumes, setDataVolumes] = useAtom(storagesAtom);
  const [dataSources, setDataSources] = useAtom(datasourcesAtom);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedNamespaces = await getVmnamespaces();
      setNamespaces(fetchedNamespaces);

      const fetchedStorages = await getStorages();
      setDataVolumes(fetchedStorages);

      const fetchedDataSources = await getDatasources();
      setDataSources(fetchedDataSources);
    };
    fetchData();
  }, []);

  const validateStorage = () => {
    if (!formData.disks || formData.disks.length === 0) return false;

    for (let disk of formData.disks) {
      if (!disk.name) return false;
      if (disk.source === 'existing' && !disk.dataVolumeName) return false;
      if (disk.source === 'new' && (!disk.imageUrl || !disk.size)) return false;
      if (disk.source === 'clone' && (!disk.dataSourceName || !disk.size)) return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setAlert(null);

    try {
      const result = await createVm(formData);

      if (result.status === 'error') {
        setAlert({ type: 'danger', message: `Failed to create VM: ${result.message}` });
      } else {
        navigate('/vms', {
          state: { alert: { type: 'success', message: `VM "${formData.name}" created successfully` } }
        });
      }
    } catch (error) {
      setAlert({ type: 'danger', message: `Error: ${error.message}` });
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
          actionClose={<button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>}
        />
      )}

      <Wizard
        height={700}
        onSave={handleSubmit}
        onClose={() => navigate('/vms')}
      >
        <WizardStep
          name="Basic Setup"
          id="basic-setup"
          footer={{
            isNextDisabled: !formData.name || !formData.namespace
          }}
        >
          <VmBasicInfo
            formData={formData}
            onChange={setFormData}
            namespaces={namespaces}
          />
        </WizardStep>

        <WizardStep
          name="Hardware"
          id="hardware"
          footer={{
            isNextDisabled: !formData.cpu || formData.cpu <= 0 || !formData.memory || !formData.memory.match(/^\d+(Mi|Gi|M|G)$/)
          }}
        >
          <VmHardware formData={formData} onChange={setFormData} />
        </WizardStep>

        <WizardStep
          name="Storage"
          id="storage"
          footer={{
            isNextDisabled: !validateStorage()
          }}
        >
          <VmStorage
            formData={formData}
            onChange={setFormData}
            dataVolumes={dataVolumes}
            dataSources={dataSources}
          />
        </WizardStep>

        <WizardStep
          name="Network"
          id="network"
        >
          <VmNetwork formData={formData} onChange={setFormData} />
        </WizardStep>

        <WizardStep
          name="Cloud-Init"
          id="cloud-init"
        >
          <VmCloudInit formData={formData} onChange={setFormData} />
        </WizardStep>

        <WizardStep
          name="Advanced"
          id="advanced"
        >
          <VmAdvanced formData={formData} onChange={setFormData} />
        </WizardStep>

        <WizardStep
          name="Review"
          id="review"
        >
          <VmReview formData={formData} />
        </WizardStep>
      </Wizard>
    </PageSection>
  );
}
