import { Card, CardBody, CardTitle, DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription, Label } from '@patternfly/react-core';

export default function VmReview({ formData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ marginBottom: '16px' }}>Review your VM configuration before creating.</p>

      <Card>
        <CardTitle>Basic Information</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription>{formData.name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Namespace</DescriptionListTerm>
              <DescriptionListDescription>{formData.namespace}</DescriptionListDescription>
            </DescriptionListGroup>
            {formData.os && (
              <DescriptionListGroup>
                <DescriptionListTerm>Operating System</DescriptionListTerm>
                <DescriptionListDescription>{formData.os}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Hardware</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>CPU Cores</DescriptionListTerm>
              <DescriptionListDescription>{formData.cpu}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Memory</DescriptionListTerm>
              <DescriptionListDescription>{formData.memory}Gi</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Storage</CardTitle>
        <CardBody>
          {formData.disks.map((disk, idx) => (
            <div key={idx} style={{ marginBottom: idx < formData.disks.length - 1 ? '16px' : 0 }}>
              <h4 style={{ marginBottom: '8px' }}>Disk {idx + 1}: {disk.name}</h4>
              <DescriptionList isHorizontal isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Source</DescriptionListTerm>
                  <DescriptionListDescription>
                    {disk.source === 'existing' ? 'Existing DataVolume' : 'New Image'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {disk.source === 'existing' && disk.dataVolumeName && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>DataVolume</DescriptionListTerm>
                    <DescriptionListDescription>{disk.dataVolumeName}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {disk.source === 'new' && disk.imageUrl && (
                  <>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Image URL</DescriptionListTerm>
                      <DescriptionListDescription>{disk.imageUrl}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Size</DescriptionListTerm>
                      <DescriptionListDescription>{disk.size || '10Gi'}</DescriptionListDescription>
                    </DescriptionListGroup>
                  </>
                )}
                {disk.bootOrder > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Boot Order</DescriptionListTerm>
                    <DescriptionListDescription>{disk.bootOrder}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Network</CardTitle>
        <CardBody>
          {formData.networks.map((network, idx) => (
            <div key={idx} style={{ marginBottom: idx < formData.networks.length - 1 ? '16px' : 0 }}>
              <DescriptionList isHorizontal isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>{network.name}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Type</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={network.type === 'pod' ? 'blue' : 'purple'}>
                      {network.type}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Model</DescriptionListTerm>
                  <DescriptionListDescription>{network.model}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          ))}
        </CardBody>
      </Card>

      {formData.cloudInit && (
        <Card>
          <CardTitle>Cloud-Init</CardTitle>
          <CardBody>
            <Label color="green">Enabled</Label>
            <pre style={{ marginTop: '8px', fontSize: '12px', background: 'var(--pf-v5-global--BackgroundColor--200)', border: '1px solid var(--pf-v5-global--BorderColor--100)', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
              {formData.cloudInit}
            </pre>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardTitle>Advanced Settings</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Run Strategy</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={formData.runStrategy === 'Always' ? 'green' : 'grey'}>
                  {formData.runStrategy}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    </div>
  );
}
