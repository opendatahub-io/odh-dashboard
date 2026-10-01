import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Alert,
  Button,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormHelperText,
  FormGroup,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  Modal,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Spinner,
  TextInput,
  Wizard,
  WizardFooterWrapper,
  WizardHeader,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { testCredentials } from '~/app/api/dch';
import ConnectionTypesGallery from '~/app/components/ConnectionTypesGallery';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import { useNotification } from '~/app/hooks/useNotification';
import type {
  ConnectionType,
  ConnectionTypeCredentialField,
  CreateConnectionRequest,
  NamespaceKind,
} from '~/app/types';

export type CreateConnectionFormData = CreateConnectionRequest;

export type CreateConnectionWizardProps = {
  isOpen: boolean;
  namespace: string;
  onClose: () => void;
  onCreate?: (data: CreateConnectionFormData, selectedNamespace: string) => void | Promise<void>;
};

const INITIAL_FORM_DATA: CreateConnectionFormData = {
  name: '',
  data_connection_type_id: '',
  format: 'tabular',
  credentials: {
    secret: '',
    properties: {},
  },
  properties: {},
};

const StepHeader: React.FC<{ title: string; description: React.ReactNode }> = ({
  title,
  description,
}) => (
  <Stack hasGutter style={{ gap: 'var(--pf-t--global--spacer--sm)' }}>
    <StackItem>
      <Content component={ContentVariants.h2}>{title}</Content>
    </StackItem>
    <StackItem>
      <Content component={ContentVariants.p}>{description}</Content>
    </StackItem>
  </Stack>
);

const K8S_NAME_MAX_LENGTH = 63;
const K8S_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const isValidConnectionName = (name: string): boolean =>
  name.length > 0 && name.length <= K8S_NAME_MAX_LENGTH && K8S_NAME_PATTERN.test(name);

const hasCredentialValue = (value?: string): boolean => Boolean(value?.trim());

type ConnectionTypeStepProps = {
  connectionTypes: ConnectionType[];
  selectedConnectionTypeId: string;
  connectionTypesLoaded: boolean;
  connectionTypesError?: Error;
  onConnectionTypeChange: (connectionType: ConnectionType) => void;
};

const ConnectionTypeStep: React.FC<ConnectionTypeStepProps> = ({
  connectionTypes,
  selectedConnectionTypeId,
  connectionTypesLoaded,
  connectionTypesError,
  onConnectionTypeChange,
}) => (
  <Form>
    <StepHeader
      title="Connection type"
      description="Select the type of external resource you want to connect to. Compare options below before continuing."
    />
    {connectionTypesError ? (
      <Alert variant="danger" isInline title="Unable to load connection types">
        {connectionTypesError.message}
      </Alert>
    ) : connectionTypesLoaded ? (
      <ConnectionTypesGallery
        connectionTypes={connectionTypes}
        isSelectable
        selectedConnectionTypeId={selectedConnectionTypeId}
        onConnectionTypeClick={onConnectionTypeChange}
      />
    ) : (
      <Spinner aria-label="Loading connection types" />
    )}
  </Form>
);

type ConnectionDetailsStepProps = {
  namespaces: NamespaceKind[];
  selectedNamespace: string;
  connectionName: string;
  properties: PropertyRow[];
  namespacesLoaded: boolean;
  namespacesError?: Error;
  connectionTypeWarning?: { connectionTypeName: string; namespace: string };
  onNamespaceChange: (namespace: string) => void;
  onConnectionNameChange: (name: string) => void;
  onPropertyAdd: () => void;
  onPropertyChange: (id: number, field: 'key' | 'value', value: string) => void;
  onPropertyRemove: (id: number) => void;
};

const ConnectionDetailsStep: React.FC<ConnectionDetailsStepProps> = ({
  namespaces,
  selectedNamespace,
  connectionName,
  properties,
  namespacesLoaded,
  namespacesError,
  connectionTypeWarning,
  onNamespaceChange,
  onConnectionNameChange,
  onPropertyAdd,
  onPropertyChange,
  onPropertyRemove,
}) => {
  const [isNamespaceSelectOpen, setIsNamespaceSelectOpen] = React.useState(false);
  const { goToStepById } = useWizardContext();
  const hasInvalidName = connectionName.length > 0 && !isValidConnectionName(connectionName);

  return (
    <Form>
      <StepHeader
        title="Connection details"
        description="Choose the project and provide a name for this connection."
      />
      {namespacesError ? (
        <Alert variant="danger" isInline title="Unable to load projects">
          {namespacesError.message}
        </Alert>
      ) : !namespacesLoaded ? (
        <Spinner aria-label="Loading projects" />
      ) : (
        <>
          {connectionTypeWarning ? (
            <Alert
              variant="warning"
              isInline
              title={`Connection type "${connectionTypeWarning.connectionTypeName}" is only available in project "${connectionTypeWarning.namespace}"`}
              actionLinks={
                <Button
                  variant="link"
                  isInline
                  onClick={() => goToStepById('connection-type-step')}
                >
                  Choose a connection type
                </Button>
              }
            >
              Select a different type or switch back to that project.
            </Alert>
          ) : null}
          <FormGroup label="Project" isRequired fieldId="connection-project">
            <Select
              isOpen={isNamespaceSelectOpen}
              selected={selectedNamespace}
              onSelect={(_event, selection) => {
                onNamespaceChange(String(selection));
                setIsNamespaceSelectOpen(false);
              }}
              onOpenChange={setIsNamespaceSelectOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsNamespaceSelectOpen((open) => !open)}
                  isExpanded={isNamespaceSelectOpen}
                  isFullWidth
                  data-testid="connection-project-select"
                >
                  {namespaces.find((item) => item.name === selectedNamespace)?.displayName ??
                    selectedNamespace}
                </MenuToggle>
              )}
            >
              <SelectList style={{ maxHeight: '200px', overflow: 'auto' }}>
                {namespaces.map((project) => (
                  <SelectOption key={project.name} value={project.name}>
                    {project.displayName ?? project.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          <FormGroup label="Connection name" isRequired fieldId="connection-name">
            <TextInput
              isRequired
              id="connection-name"
              value={connectionName}
              onChange={(_event, value) => onConnectionNameChange(value)}
              validated={hasInvalidName ? 'error' : 'default'}
              data-testid="connection-name-input"
            />
            {hasInvalidName ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">
                    Use lowercase letters, numbers, and hyphens. Start and end with a letter or
                    number, and use no more than 63 characters.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
          <FormGroup label="Key-value pairs" fieldId="properties">
            <PropertiesStep
              properties={properties}
              onAdd={onPropertyAdd}
              onChange={onPropertyChange}
              onRemove={onPropertyRemove}
            />
          </FormGroup>
        </>
      )}
    </Form>
  );
};

type CredentialFieldProps = {
  field: ConnectionTypeCredentialField;
  value: string;
  onChange: (value: string) => void;
};

const CredentialField: React.FC<CredentialFieldProps> = ({ field, value, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasOptions = Boolean(field.enum_values?.length);

  return (
    <FormGroup label={field.label} isRequired={field.required} fieldId={`credential-${field.name}`}>
      {hasOptions ? (
        <Select
          isOpen={isOpen}
          selected={value}
          onSelect={(_event, selection) => {
            onChange(String(selection));
            setIsOpen(false);
          }}
          onOpenChange={setIsOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsOpen((open) => !open)}
              isExpanded={isOpen}
              isFullWidth
              data-testid={`credential-${field.name}`}
            >
              {field.enum_values?.find((option) => option.value === value)?.label ??
                `Select ${field.label}`}
            </MenuToggle>
          )}
        >
          <SelectList>
            {field.enum_values?.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      ) : (
        <TextInput
          id={`credential-${field.name}`}
          type="password"
          value={value}
          onChange={(_event, nextValue) => onChange(nextValue)}
          isRequired={field.required}
          data-testid={`credential-${field.name}`}
        />
      )}
      {field.description ? (
        <Content component={ContentVariants.small}>{field.description}</Content>
      ) : null}
    </FormGroup>
  );
};

type ConfigurationStepProps = {
  connectionType?: ConnectionType;
  credentials: Record<string, string>;
  onCredentialChange: (name: string, value: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  isVerified: boolean;
  verificationError?: Error;
};

type VerificationSectionProps = Omit<ConfigurationStepProps, 'onCredentialChange'>;

const VerifyConnectionSection: React.FC<VerificationSectionProps & { showTitle?: boolean }> = ({
  connectionType,
  credentials,
  onVerify,
  isVerifying,
  isVerified,
  verificationError,
  showTitle = true,
}) => {
  const fields = connectionType?.resource.credentials_fields ?? [];

  return (
    <div className="pf-v6-u-mt-xl">
      {showTitle ? <Content component={ContentVariants.h3}>Verify connection</Content> : null}
      <Content component={ContentVariants.p}>
        Optionally verify your credentials and endpoint.
      </Content>
      <Button
        variant="tertiary"
        onClick={onVerify}
        isLoading={isVerifying}
        isDisabled={
          isVerifying ||
          fields.some((field) => field.required && !hasCredentialValue(credentials[field.name]))
        }
        className="pf-v6-u-mb-md"
        data-testid="verify-connection-button"
      >
        Verify
      </Button>
      {isVerified ? (
        <Alert variant="success" isInline title="Connection successful">
          {connectionType?.resource.name ?? 'The connection type'} is reachable
        </Alert>
      ) : null}
      {verificationError ? (
        <Alert variant="danger" isInline title="Connection verification failed">
          {verificationError.message}
        </Alert>
      ) : null}
    </div>
  );
};

const ConfigurationStep: React.FC<ConfigurationStepProps> = (props) => {
  const { connectionType, credentials, onCredentialChange } = props;
  const fields = connectionType?.resource.credentials_fields ?? [];

  return (
    <Form>
      <StepHeader
        title="Configuration"
        description={
          <>
            Configure credentials and connection parameters for{' '}
            <strong>{connectionType?.resource.name ?? 'the selected connection type'}</strong>.
          </>
        }
      />
      {fields.map((field) => (
        <CredentialField
          key={field.name}
          field={field}
          value={credentials[field.name] ?? field.default_value ?? ''}
          onChange={(value) => onCredentialChange(field.name, value)}
        />
      ))}
      <VerifyConnectionSection {...props} />
    </Form>
  );
};

type ReviewStepProps = VerificationSectionProps & {
  name: string;
  namespace: string;
  properties: Record<string, string>;
};

const ReviewCredentialValue: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const displayValue = value?.trim() ? value : '-';

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      spaceItems={{ default: 'spaceItemsNone' }}
    >
      <FlexItem>
        <span>
          {isVisible || displayValue === '-' ? displayValue : '•'.repeat(displayValue.length)}
        </span>
      </FlexItem>
      {displayValue !== '-' ? (
        <FlexItem>
          <Button
            variant="plain"
            icon={isVisible ? <EyeSlashIcon /> : <EyeIcon />}
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
            data-testid={`review-show-${label}`}
          />
        </FlexItem>
      ) : null}
    </Flex>
  );
};

const ReviewStep: React.FC<ReviewStepProps> = ({
  name,
  namespace,
  connectionType,
  credentials,
  properties,
  ...verificationProps
}) => {
  const fields = connectionType?.resource.credentials_fields ?? [];
  const valueOrDash = (value?: string): string => (value?.trim() ? value : '-');

  return (
    <>
      <StepHeader
        title="Review"
        description="Review the information below and click Create connection to complete. Use the Back button to make changes."
      />
      <Content component={ContentVariants.h3}>Summary</Content>
      <DescriptionList
        isHorizontal
        horizontalTermWidthModifier={{ default: '15ch' }}
        className="pf-v6-u-mb-lg"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Connection name</DescriptionListTerm>
          <DescriptionListDescription>{valueOrDash(name)}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Project</DescriptionListTerm>
          <DescriptionListDescription>{valueOrDash(namespace)}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Connection type</DescriptionListTerm>
          <DescriptionListDescription>
            {valueOrDash(connectionType?.resource.name)}
            {connectionType && !connectionType.metadata.tenant_id ? (
              <Label variant="outline" color="grey" isCompact className="pf-v6-u-ml-sm">
                Global
              </Label>
            ) : null}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {fields.map((field) => (
          <DescriptionListGroup key={field.name}>
            <DescriptionListTerm>{field.label}</DescriptionListTerm>
            <DescriptionListDescription>
              <ReviewCredentialValue
                label={field.label}
                value={credentials[field.name] ?? field.default_value}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
        <DescriptionListGroup>
          <DescriptionListTerm>Key-value pairs</DescriptionListTerm>
          <DescriptionListDescription>
            {Object.entries(properties).length > 0 ? (
              <LabelGroup>
                {Object.entries(properties).map(([key, value]) => (
                  <Label key={key} variant="outline" color="grey" isCompact>
                    {key}: {value}
                  </Label>
                ))}
              </LabelGroup>
            ) : (
              '-'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
      <Content component={ContentVariants.h3}>Verify connection</Content>
      <VerifyConnectionSection
        {...verificationProps}
        connectionType={connectionType}
        credentials={credentials}
        showTitle={false}
      />
    </>
  );
};

type PropertyRow = { id: number; key: string; value: string };

type PropertiesStepProps = {
  properties: PropertyRow[];
  onAdd: () => void;
  onChange: (id: number, field: 'key' | 'value', value: string) => void;
  onRemove: (id: number) => void;
};

const PropertiesStep: React.FC<PropertiesStepProps> = ({
  properties,
  onAdd,
  onChange,
  onRemove,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Content component={ContentVariants.p}>
        Optionally define metadata to help discover and govern this connection in Data Connect Hub.
      </Content>
    </StackItem>
    <StackItem>
      {properties.length > 0 ? (
        <Grid hasGutter className="pf-v6-u-mb-sm">
          <GridItem span={5}>Key</GridItem>
          <GridItem span={5}>Value</GridItem>
          <GridItem span={2} aria-hidden="true" />
        </Grid>
      ) : null}
      {properties.map((property) => (
        <Grid key={property.id} hasGutter className="pf-v6-u-mb-md">
          <GridItem span={5}>
            <TextInput
              id={`connection-property-key-${property.id}`}
              value={property.key}
              placeholder="Key"
              onChange={(_event, value) => onChange(property.id, 'key', value)}
              data-testid={`connection-property-key-${property.id}`}
            />
          </GridItem>
          <GridItem span={5}>
            <TextInput
              id={`connection-property-value-${property.id}`}
              value={property.value}
              placeholder="Value"
              onChange={(_event, value) => onChange(property.id, 'value', value)}
              data-testid={`connection-property-value-${property.id}`}
            />
          </GridItem>
          <GridItem span={2}>
            <Button
              variant="plain"
              icon={<MinusCircleIcon />}
              onClick={() => onRemove(property.id)}
              aria-label={`Remove property ${property.key || property.id}`}
              data-testid={`connection-property-remove-${property.id}`}
            />
          </GridItem>
        </Grid>
      ))}
      <Button variant="link" isInline icon={<PlusCircleIcon />} onClick={onAdd}>
        Add key-value pair
      </Button>
    </StackItem>
  </Stack>
);

type CreateConnectionWizardFooterProps = {
  onCreate: () => void;
  isCreating: boolean;
  hasConnectionType: boolean;
  hasConnectionTypesReady: boolean;
  hasValidDetails: boolean;
  hasValidConfiguration: boolean;
};

const CreateConnectionWizardFooter: React.FC<CreateConnectionWizardFooterProps> = ({
  onCreate,
  isCreating,
  hasConnectionType,
  hasConnectionTypesReady,
  hasValidDetails,
  hasValidConfiguration,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;
  const isNextDisabled =
    activeStep.index === 1
      ? !hasConnectionType || !hasConnectionTypesReady
      : activeStep.index === 2
        ? !hasValidDetails
        : !hasValidConfiguration;

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="secondary"
              onClick={goToPrevStep}
              isDisabled={isFirstStep || isCreating}
            >
              Back
            </Button>
          </ActionListItem>
          <ActionListItem>
            {isLastStep ? (
              <Button
                variant="primary"
                onClick={onCreate}
                isLoading={isCreating}
                isDisabled={isCreating || !hasValidConfiguration}
                data-testid="create-connection-submit"
              >
                Create connection
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={goToNextStep}
                isDisabled={isCreating || isNextDisabled}
              >
                Next
              </Button>
            )}
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close} isDisabled={isCreating}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

const CreateConnectionWizard: React.FC<CreateConnectionWizardProps> = ({
  isOpen,
  namespace,
  onClose,
  onCreate,
}) => {
  const [formData, setFormData] = React.useState<CreateConnectionFormData>(INITIAL_FORM_DATA);
  const [selectedNamespace, setSelectedNamespace] = React.useState(namespace);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<Error>();
  const [connectionTypeWarning, setConnectionTypeWarning] = React.useState<{
    connectionTypeName: string;
    namespace: string;
  }>();
  const [propertyRows, setPropertyRows] = React.useState<PropertyRow[]>([]);
  const propertyIdRef = React.useRef(0);
  const verificationRequestRef = React.useRef(0);
  const verificationAbortRef = React.useRef<AbortController>();
  const [connectionTypes, connectionTypesLoaded, connectionTypesError] = useConnectionTypes(
    selectedNamespace,
    isOpen,
  );
  const [namespaces, namespacesLoaded, namespacesError] = useNamespaces(isOpen);
  const notification = useNotification();
  const availableNamespaces = namespaces.some((item) => item.name === namespace)
    ? namespaces
    : [{ name: namespace }, ...namespaces];
  const selectedConnectionType = connectionTypes.find(
    (connectionType) => connectionType.metadata.id === formData.data_connection_type_id,
  );
  const hasConnectionType = Boolean(formData.data_connection_type_id);
  const hasConnectionTypesReady = connectionTypesLoaded && !connectionTypesError;
  const hasNamespacesReady = namespacesLoaded && !namespacesError;
  const hasValidDetails =
    hasConnectionType &&
    hasNamespacesReady &&
    Boolean(selectedNamespace) &&
    isValidConnectionName(formData.name);
  const requiredCredentialFields =
    selectedConnectionType?.resource.credentials_fields?.filter((field) => field.required) ?? [];
  const hasValidConfiguration =
    hasValidDetails &&
    requiredCredentialFields.every((field) =>
      hasCredentialValue(formData.credentials.properties[field.name]),
    );
  const invalidateVerification = React.useCallback(() => {
    verificationRequestRef.current += 1;
    verificationAbortRef.current?.abort();
    verificationAbortRef.current = undefined;
    setIsVerifying(false);
    setIsVerified(false);
    setVerificationError(undefined);
  }, []);
  React.useEffect(() => {
    if (!isOpen) {
      invalidateVerification();
    }
  }, [invalidateVerification, isOpen]);
  const handleConnectionTypeChange = (connectionTypeId: string) => {
    invalidateVerification();
    const selectedType = connectionTypes.find(
      (connectionType) => connectionType.metadata.id === connectionTypeId,
    );
    const defaultCredentials = Object.fromEntries(
      (selectedType?.resource.credentials_fields ?? [])
        .filter((field) => field.default_value !== undefined)
        .map((field) => [field.name, field.default_value ?? '']),
    );
    setFormData((current) => ({
      ...current,
      data_connection_type_id: connectionTypeId,
      credentials: { ...current.credentials, properties: defaultCredentials },
    }));
    setConnectionTypeWarning(undefined);
  };
  const handleConnectionNameChange = (name: string) => {
    setFormData((current) => ({
      ...current,
      name,
      credentials: { ...current.credentials, secret: name },
    }));
  };
  const handleNamespaceChange = (nextNamespace: string) => {
    invalidateVerification();
    if (
      selectedConnectionType?.metadata.tenant_id &&
      selectedConnectionType.metadata.tenant_id !== nextNamespace
    ) {
      setConnectionTypeWarning({
        connectionTypeName: selectedConnectionType.resource.name,
        namespace: selectedConnectionType.metadata.tenant_id,
      });
      setFormData((current) => ({
        ...current,
        data_connection_type_id: '',
        credentials: { ...current.credentials, properties: {} },
      }));
    } else {
      setConnectionTypeWarning(undefined);
    }
    setSelectedNamespace(nextNamespace);
  };
  const handleCredentialChange = (name: string, value: string) => {
    invalidateVerification();
    setFormData((current) => ({
      ...current,
      credentials: {
        ...current.credentials,
        properties: { ...current.credentials.properties, [name]: value },
      },
    }));
    setConnectionTypeWarning(undefined);
  };
  const updateProperties = (rows: PropertyRow[]) => {
    setPropertyRows(rows);
    setFormData((current) => ({
      ...current,
      properties: Object.fromEntries(
        rows.filter((row) => row.key.trim()).map((row) => [row.key, row.value]),
      ),
    }));
  };
  const handleAddProperty = () => {
    const id = ++propertyIdRef.current;
    updateProperties([...propertyRows, { id, key: '', value: '' }]);
  };
  const handlePropertyChange = (id: number, field: 'key' | 'value', value: string) => {
    updateProperties(propertyRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };
  const handleRemoveProperty = (id: number) => {
    updateProperties(propertyRows.filter((row) => row.id !== id));
  };
  const handleVerify = async () => {
    if (!selectedConnectionType || !hasValidConfiguration) {
      return;
    }
    verificationAbortRef.current?.abort();
    const requestId = ++verificationRequestRef.current;
    const abortController = new AbortController();
    verificationAbortRef.current = abortController;
    setIsVerifying(true);
    setIsVerified(false);
    setVerificationError(undefined);
    try {
      await testCredentials('')({ signal: abortController.signal }, selectedNamespace, {
        data_connection_type_id: selectedConnectionType.metadata.id,
        credentials: formData.credentials.properties,
      });
      if (requestId !== verificationRequestRef.current || abortController.signal.aborted) {
        return;
      }
      setIsVerified(true);
    } catch (error) {
      if (
        requestId !== verificationRequestRef.current ||
        abortController.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return;
      }
      setVerificationError(
        error instanceof Error ? error : new Error('Unable to verify connection'),
      );
    } finally {
      if (requestId === verificationRequestRef.current) {
        setIsVerifying(false);
      }
    }
  };
  const resetForm = React.useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedNamespace(namespace);
    setIsCreating(false);
    invalidateVerification();
    setPropertyRows([]);
    propertyIdRef.current = 0;
  }, [invalidateVerification, namespace]);
  const handleClose = React.useCallback(() => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  }, [isCreating, onClose, resetForm]);

  const handleCreate = async () => {
    if (!onCreate) {
      resetForm();
      onClose();
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(formData, selectedNamespace);
      notification.success(`"${formData.name}" was created successfully.`);
      resetForm();
      onClose();
    } catch (error) {
      const creationError =
        error instanceof Error ? error : new Error('Unable to create connection');
      notification.error('Unable to create connection', creationError.message);
    } finally {
      setIsCreating(false);
    }
  };

  return isOpen ? (
    <Modal
      variant={ModalVariant.large}
      isOpen
      onEscapePress={handleClose}
      aria-labelledby="create-connection-wizard-title"
      data-testid="create-connection-modal"
    >
      <Wizard
        onClose={handleClose}
        header={
          <WizardHeader
            title="Create connection"
            description="Configure your connection to an external resource."
            titleId="create-connection-wizard-title"
            onClose={handleClose}
            closeButtonAriaLabel="Close wizard"
          />
        }
        footer={
          <CreateConnectionWizardFooter
            onCreate={handleCreate}
            isCreating={isCreating}
            hasConnectionType={hasConnectionType}
            hasConnectionTypesReady={hasConnectionTypesReady}
            hasValidDetails={hasValidDetails}
            hasValidConfiguration={hasValidConfiguration}
          />
        }
      >
        <WizardStep name="Connection type" id="connection-type-step">
          <ConnectionTypeStep
            connectionTypes={connectionTypes}
            connectionTypesLoaded={connectionTypesLoaded}
            connectionTypesError={connectionTypesError}
            selectedConnectionTypeId={formData.data_connection_type_id}
            onConnectionTypeChange={(connectionType) =>
              handleConnectionTypeChange(connectionType.metadata.id)
            }
          />
        </WizardStep>
        <WizardStep
          name="Connection details"
          id="connection-details-step"
          isDisabled={!hasConnectionType || !hasConnectionTypesReady}
        >
          <ConnectionDetailsStep
            namespaces={availableNamespaces}
            selectedNamespace={selectedNamespace}
            connectionName={formData.name}
            properties={propertyRows}
            namespacesLoaded={namespacesLoaded}
            namespacesError={namespacesError}
            connectionTypeWarning={connectionTypeWarning}
            onNamespaceChange={handleNamespaceChange}
            onConnectionNameChange={handleConnectionNameChange}
            onPropertyAdd={handleAddProperty}
            onPropertyChange={handlePropertyChange}
            onPropertyRemove={handleRemoveProperty}
          />
        </WizardStep>
        <WizardStep name="Configuration" id="configuration-step" isDisabled={!hasValidDetails}>
          <ConfigurationStep
            connectionType={selectedConnectionType}
            credentials={formData.credentials.properties}
            onCredentialChange={handleCredentialChange}
            onVerify={() => void handleVerify()}
            isVerifying={isVerifying}
            isVerified={isVerified}
            verificationError={verificationError}
          />
        </WizardStep>
        <WizardStep name="Review" id="review-step" isDisabled={!hasValidConfiguration}>
          <ReviewStep
            name={formData.name}
            namespace={selectedNamespace}
            connectionType={selectedConnectionType}
            credentials={formData.credentials.properties}
            properties={formData.properties}
            onVerify={() => void handleVerify()}
            isVerifying={isVerifying}
            isVerified={isVerified}
            verificationError={verificationError}
          />
        </WizardStep>
      </Wizard>
    </Modal>
  ) : null;
};

export default CreateConnectionWizard;
