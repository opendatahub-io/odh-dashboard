import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormSection,
  TextInput,
  TextArea,
  Alert,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Content,
  Label,
  LabelGroup,
  Popover,
  Icon,
} from '@patternfly/react-core';
import { PlusCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { createVolume } from '~/app/api/dataRegistry';
import { CreateVolumeRequest } from '~/app/types';

type RegisterVolumeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collections: string[];
  onCreated: () => void;
  onManageCollections: () => void;
};

const FORMAT_OPTIONS = [
  { key: 'documents', label: 'Documents', description: 'Text, PDFs, and office files' },
  { key: 'images', label: 'Images', description: 'Photos, graphics, and medical scans' },
  { key: 'audio', label: 'Audio', description: 'Speech, music, and sound recordings' },
  { key: 'video', label: 'Video', description: 'Clips, recordings, and video streams' },
  { key: 'binary', label: 'Binary', description: 'Models, code, and compressed archives' },
  { key: 'other', label: 'Other', description: 'Custom or uncategorized formats' },
];

const LICENSE_OPTIONS = [
  { key: 'internal-use', label: 'Internal use' },
  { key: 'cc-by-4.0', label: 'CC BY 4.0' },
  { key: 'apache-2.0', label: 'Apache 2.0' },
  { key: 'proprietary', label: 'Proprietary' },
  { key: 'restricted', label: 'Restricted' },
];

const MATURITY_OPTIONS = [
  { key: 'experimental', label: 'Experimental' },
  { key: 'staging', label: 'Staging' },
  { key: 'production', label: 'Production' },
  { key: 'deprecated', label: 'Deprecated' },
];

const PII_OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'contains-pii', label: 'Contains PII' },
  { key: 'contains-sensitive', label: 'Contains sensitive' },
  { key: 'anonymized', label: 'Anonymized' },
];

const RegisterVolumeModal: React.FC<RegisterVolumeModalProps> = ({
  isOpen,
  onClose,
  project,
  collections,
  onCreated,
  onManageCollections,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [format, setFormat] = React.useState('other');
  const [collection, setCollection] = React.useState('');
  const [labels, setLabels] = React.useState<string[]>([]);
  const [isAddingLabel, setIsAddingLabel] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [connection, setConnection] = React.useState('');
  const [path, setPath] = React.useState('/');
  const [purpose, setPurpose] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [maturity, setMaturity] = React.useState('');
  const [piiStatus, setPiiStatus] = React.useState('');
  const [customProperties, setCustomProperties] = React.useState<
    Array<{ key: string; value: string }>
  >([]);
  const [isFormatOpen, setIsFormatOpen] = React.useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = React.useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = React.useState(false);
  const [isMaturityOpen, setIsMaturityOpen] = React.useState(false);
  const [isPiiOpen, setIsPiiOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.key === format);

  const handleAddLabel = React.useCallback(() => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels((prev) => [...prev, newLabel.trim()]);
      setNewLabel('');
      setIsAddingLabel(false);
    }
  }, [newLabel, labels]);

  const handleRemoveLabel = React.useCallback((label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  }, []);

  const handleAddCustomProperty = React.useCallback(() => {
    setCustomProperties((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const handleRemoveCustomProperty = React.useCallback((index: number) => {
    setCustomProperties((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCustomPropertyChange = React.useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      setCustomProperties((prev) =>
        prev.map((prop, i) => (i === index ? { ...prop, [field]: value } : prop)),
      );
    },
    [],
  );

  const resetForm = React.useCallback(() => {
    setName('');
    setDescription('');
    setFormat('other');
    setCollection('');
    setLabels([]);
    setIsAddingLabel(false);
    setNewLabel('');
    setConnection('');
    setPath('/');
    setPurpose('');
    setLicense('');
    setMaturity('');
    setPiiStatus('');
    setCustomProperties([]);
    setError('');
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!name.trim() || !collection) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const requestData: CreateVolumeRequest = {
        name: name.trim(),
        // eslint-disable-next-line camelcase
        content_type: format,
      };
      if (description) {
        requestData.description = description;
      }
      if (path && path !== '/') {
        requestData.location = path;
      }
      if (labels.length > 0) {
        requestData.labels = labels;
      }
      const properties: Record<string, string> = {};
      if (purpose) {
        properties.purpose = purpose;
      }
      if (license) {
        properties.license = license;
      }
      if (maturity) {
        properties.maturity = maturity;
      }
      if (piiStatus) {
        // eslint-disable-next-line camelcase
        properties.pii_status = piiStatus;
      }
      customProperties.forEach((prop) => {
        if (prop.key && prop.value) {
          properties[prop.key] = prop.value;
        }
      });
      if (Object.keys(properties).length > 0) {
        requestData.properties = properties;
      }
      await createVolume(project, collection, requestData);
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register volume');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    description,
    format,
    collection,
    labels,
    path,
    purpose,
    license,
    maturity,
    piiStatus,
    customProperties,
    project,
    resetForm,
    onCreated,
    onClose,
  ]);

  const handleClose = React.useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      data-testid="register-volume-modal"
    >
      <ModalHeader
        title="Register data"
        description={
          <Content component="p">
            Create a new data asset and configure its source location, metadata, and schema.
          </Content>
        }
      />
      <ModalBody>
        {error ? (
          <Alert variant="danger" isInline title="Error registering volume">
            {error}
          </Alert>
        ) : null}
        <Form>
          {/* ── Data asset details ── */}
          <FormSection title="Data asset details" titleElement="h2">
            <Content component="p">
              Provide general identification and classification details for this data asset.
            </Content>

            <FormGroup label="Asset name" isRequired fieldId="volume-name">
              <TextInput
                id="volume-name"
                value={name}
                onChange={(_event, value) => setName(value)}
                isRequired
                data-testid="volume-name-input"
              />
            </FormGroup>

            <FormGroup label="Asset description" fieldId="volume-description">
              <TextArea
                id="volume-description"
                value={description}
                onChange={(_event, value) => setDescription(value)}
                data-testid="volume-description-input"
              />
            </FormGroup>

            <FormGroup
              label="Asset type"
              isRequired
              fieldId="asset-type"
              labelHelp={
                <Popover bodyContent="Only unstructured data volumes are supported in this release.">
                  <Icon aria-label="Asset type info" role="button">
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                </Popover>
              }
            >
              <MenuToggle isDisabled isFullWidth data-testid="asset-type-toggle">
                Unstructured
              </MenuToggle>
            </FormGroup>

            <FormGroup label="Format" fieldId="volume-format">
              <Select
                isOpen={isFormatOpen}
                selected={format}
                onSelect={(_event, value) => {
                  setFormat(String(value));
                  setIsFormatOpen(false);
                }}
                onOpenChange={setIsFormatOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsFormatOpen((prev) => !prev)}
                    isExpanded={isFormatOpen}
                    isFullWidth
                    data-testid="volume-format-toggle"
                  >
                    {selectedFormat?.label || 'Select format'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {FORMAT_OPTIONS.map((option) => (
                    <SelectOption
                      key={option.key}
                      value={option.key}
                      description={option.description}
                    >
                      {option.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>

            <FormGroup label="Collection" fieldId="volume-collection">
              <Content component="p">
                Assign this asset to collections to help group your data. To manage collections for
                the entire project, go to{' '}
                <Button variant="link" isInline onClick={onManageCollections}>
                  Manage collections
                </Button>
                .
              </Content>
              <Select
                isOpen={isCollectionOpen}
                selected={collection}
                onSelect={(_event, value) => {
                  if (value === '__create_new__') {
                    setIsCollectionOpen(false);
                    onManageCollections();
                    return;
                  }
                  setCollection(String(value));
                  setIsCollectionOpen(false);
                }}
                onOpenChange={setIsCollectionOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsCollectionOpen((prev) => !prev)}
                    isExpanded={isCollectionOpen}
                    isFullWidth
                    data-testid="volume-collection-toggle"
                  >
                    {collection || 'Select collection'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {collections.map((coll) => (
                    <SelectOption key={coll} value={coll}>
                      {coll}
                    </SelectOption>
                  ))}
                  <SelectOption key="__create_new__" value="__create_new__">
                    <Button variant="link" isInline icon={<PlusCircleIcon />}>
                      Create new collection
                    </Button>
                  </SelectOption>
                </SelectList>
              </Select>
            </FormGroup>

            <FormGroup label="Labels" fieldId="volume-labels">
              <Content component="p">
                Add labels to help organize and filter this asset. To manage labels for the entire
                project, go to{' '}
                <Button variant="link" isInline isDisabled>
                  Manage labels
                </Button>
                .
              </Content>
              {labels.length > 0 ? (
                <LabelGroup numLabels={5}>
                  {labels.map((label) => (
                    <Label key={label} onClose={() => handleRemoveLabel(label)}>
                      {label}
                    </Label>
                  ))}
                </LabelGroup>
              ) : null}
              {isAddingLabel ? (
                <TextInput
                  id="volume-labels-input"
                  value={newLabel}
                  onChange={(_event, value) => setNewLabel(value)}
                  placeholder="Enter label name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                    if (e.key === 'Escape') {
                      setIsAddingLabel(false);
                      setNewLabel('');
                    }
                  }}
                  onBlur={() => {
                    if (newLabel.trim()) {
                      handleAddLabel();
                    } else {
                      setIsAddingLabel(false);
                    }
                  }}
                  autoFocus
                  data-testid="volume-labels-input"
                />
              ) : null}
              <Button
                variant="link"
                icon={<PlusCircleIcon />}
                onClick={() => setIsAddingLabel(true)}
                data-testid="add-label-button"
              >
                Add label
              </Button>
            </FormGroup>
          </FormSection>

          {/* ── Data location ── */}
          <FormSection title="Data location" titleElement="h2">
            <Content component="p">
              Specify where the data is stored by selecting a connection or providing path details.
            </Content>

            <FormGroup label="Connection" fieldId="volume-connection">
              <Select
                isOpen={isConnectionOpen}
                selected={connection}
                onSelect={(_event, value) => {
                  setConnection(String(value));
                  setIsConnectionOpen(false);
                }}
                onOpenChange={setIsConnectionOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsConnectionOpen((prev) => !prev)}
                    isExpanded={isConnectionOpen}
                    isFullWidth
                    data-testid="volume-connection-toggle"
                  >
                    {connection || 'Select a connection'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="" isDisabled>
                    No connections available
                  </SelectOption>
                </SelectList>
              </Select>
            </FormGroup>

            <FormGroup label="Path" fieldId="volume-path">
              <TextInput
                id="volume-path"
                value={path}
                onChange={(_event, value) => setPath(value)}
                data-testid="volume-path-input"
              />
            </FormGroup>
          </FormSection>

          {/* ── Properties ── */}
          <FormSection title="Properties" titleElement="h2">
            <Content component="p">
              Define operational metadata, compliance levels, and discoverability tags.
            </Content>

            <FormGroup label="Purpose" fieldId="volume-purpose">
              <TextInput
                id="volume-purpose"
                value={purpose}
                onChange={(_event, value) => setPurpose(value)}
                placeholder="e.g. ML training, fraud detection"
                data-testid="volume-purpose-input"
              />
            </FormGroup>

            <FormGroup label="License" fieldId="volume-license">
              <Select
                isOpen={isLicenseOpen}
                selected={license}
                onSelect={(_event, value) => {
                  setLicense(String(value));
                  setIsLicenseOpen(false);
                }}
                onOpenChange={setIsLicenseOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsLicenseOpen((prev) => !prev)}
                    isExpanded={isLicenseOpen}
                    isFullWidth
                    data-testid="volume-license-toggle"
                  >
                    {LICENSE_OPTIONS.find((o) => o.key === license)?.label || 'Select license'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {LICENSE_OPTIONS.map((o) => (
                    <SelectOption key={o.key} value={o.key}>
                      {o.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>

            <FormGroup label="Maturity" fieldId="volume-maturity">
              <Select
                isOpen={isMaturityOpen}
                selected={maturity}
                onSelect={(_event, value) => {
                  setMaturity(String(value));
                  setIsMaturityOpen(false);
                }}
                onOpenChange={setIsMaturityOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsMaturityOpen((prev) => !prev)}
                    isExpanded={isMaturityOpen}
                    isFullWidth
                    data-testid="volume-maturity-toggle"
                  >
                    {MATURITY_OPTIONS.find((o) => o.key === maturity)?.label || 'Select maturity'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {MATURITY_OPTIONS.map((o) => (
                    <SelectOption key={o.key} value={o.key}>
                      {o.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>

            <FormGroup label="PII status" fieldId="volume-pii">
              <Select
                isOpen={isPiiOpen}
                selected={piiStatus}
                onSelect={(_event, value) => {
                  setPiiStatus(String(value));
                  setIsPiiOpen(false);
                }}
                onOpenChange={setIsPiiOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsPiiOpen((prev) => !prev)}
                    isExpanded={isPiiOpen}
                    isFullWidth
                    data-testid="volume-pii-toggle"
                  >
                    {PII_OPTIONS.find((o) => o.key === piiStatus)?.label || 'Select PII status'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {PII_OPTIONS.map((o) => (
                    <SelectOption key={o.key} value={o.key}>
                      {o.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
          </FormSection>

          {/* ── Custom properties ── */}
          <FormSection title="Custom properties" titleElement="h2">
            <FormGroup fieldId="volume-custom-properties">
              <Content component="p">
                Add key/value pair annotations to attach metadata to this asset.
              </Content>
              <Button
                variant="link"
                icon={<PlusCircleIcon />}
                onClick={handleAddCustomProperty}
                data-testid="add-custom-property"
              >
                Add key/value pair
              </Button>
              {customProperties.map((prop, index) => (
                <div key={index} className="pf-v6-u-display-flex pf-v6-u-gap-md pf-v6-u-mb-md">
                  <TextInput
                    value={prop.key}
                    onChange={(_event, value) => handleCustomPropertyChange(index, 'key', value)}
                    placeholder="Key"
                    data-testid={`custom-property-key-${index}`}
                  />
                  <TextInput
                    value={prop.value}
                    onChange={(_event, value) => handleCustomPropertyChange(index, 'value', value)}
                    placeholder="Value"
                    data-testid={`custom-property-value-${index}`}
                  />
                  <Button
                    variant="plain"
                    onClick={() => handleRemoveCustomProperty(index)}
                    aria-label="Remove property"
                    data-testid={`custom-property-remove-${index}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </FormGroup>
          </FormSection>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!name.trim() || !collection || isSubmitting}
          isLoading={isSubmitting}
          data-testid="register-volume-submit"
        >
          Register
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterVolumeModal;
