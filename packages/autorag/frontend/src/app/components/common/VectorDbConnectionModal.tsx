import React from 'react';
import PasswordInput from '@odh-dashboard/internal/components/PasswordInput';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { useCreateSecretMutation } from '@odh-dashboard/autox-core/ui/hooks';
import {
  parseVectorDbConnection,
  type VectorDbConnectionFields,
  type VectorDbProvider,
} from '~/app/schemas/vectorDbConnection.schema';

type Props = {
  namespace: string;
  initialProvider?: Provider;
  allowedProviders?: readonly Provider[];
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
};

type Provider = VectorDbProvider;

const NEO4J_OPTIONAL_FIELDS: ReadonlyArray<{
  key: 'NEO4J_USERNAME' | 'NEO4J_DATABASE';
  label: string;
  type: 'text' | 'password';
  guidance: string;
}> = [
  {
    key: 'NEO4J_DATABASE',
    label: 'Database',
    type: 'text',
    guidance: 'Name of the Neo4j database to connect to. Defaults to "neo4j" if left blank',
  },
  {
    key: 'NEO4J_USERNAME',
    label: 'Username',
    type: 'text',
    guidance: 'Neo4j username used for authentication. Defaults to "neo4j" if left blank',
  },
];

const CA_CERTIFICATE_GUIDANCE =
  "Optional PEM-encoded CA certificate used to verify the server's TLS certificate. Required when TLS certificate verification is enabled and the server uses a private or self-signed CA. Public-host connections with TLS verification enabled will fail if the required CA certificate is not provided. Leave blank for connections that do not use TLS verification.";

const getDescribedBy = (fieldId: string, hasError: boolean): string =>
  [`${fieldId}-description`, hasError ? `${fieldId}-error` : undefined].filter(Boolean).join(' ');

const FieldHelperText: React.FC<{
  id: string;
  children: React.ReactNode;
  variant?: 'default' | 'error';
}> = ({ id, children, variant = 'default' }) => (
  <FormHelperText id={id}>
    <HelperText>
      <HelperTextItem variant={variant}>{children}</HelperTextItem>
    </HelperText>
  </FormHelperText>
);

const VectorDbConnectionModal: React.FC<Props> = ({
  namespace,
  initialProvider = 'milvus',
  allowedProviders = ['milvus', 'pgvector', 'neo4j'],
  onClose,
  onSubmit,
}) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [provider, setProvider] = React.useState<Provider>(() =>
    allowedProviders.includes(initialProvider) ? initialProvider : allowedProviders[0],
  );
  const [fields, setFields] = React.useState<VectorDbConnectionFields>({});
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const createdSecretRef = React.useRef<SecretKind>();
  const createSecretMutation = useCreateSecretMutation();

  const getField = (key: string): string => fields[key] ?? '';
  const validationResult = parseVectorDbConnection(provider, fields);
  const getFieldError = (key: string): string | undefined =>
    validationResult.success || !Object.prototype.hasOwnProperty.call(fields, key)
      ? undefined
      : validationResult.error.issues.find((issue) => issue.path[0] === key)?.message;
  const isFormValid = isK8sNameDescriptionDataValid(nameDescData) && validationResult.success;
  const uriKey = provider === 'neo4j' ? 'NEO4J_URI' : 'MILVUS_URI';
  const uri = getField(uriKey);

  const setField = (key: string, value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const handleProviderChange = (nextProvider: Provider) => {
    setProvider(nextProvider);
    setFields({});
  };

  const handleSubmit = async () => {
    const parsed = parseVectorDbConnection(provider, fields);
    if (!parsed.success || !isK8sNameDescriptionDataValid(nameDescData)) {
      return;
    }
    setIsSaving(true);
    setSubmitError(undefined);
    const k8sName = nameDescData.k8sName.value;
    const stringData = Object.fromEntries(
      Object.entries(parsed.data).reduce<Array<[string, string]>>(
        (entries, [key, value]) => (value ? [...entries, [key, value]] : entries),
        [],
      ),
    );

    const secret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: k8sName,
        namespace,
        annotations: {
          'openshift.io/display-name': nameDescData.name.trim(),
          'opendatahub.io/connection-type': provider === 'neo4j' ? 'database' : 'vector-db',
          ...(provider === 'neo4j'
            ? { 'opendatahub.io/database-provider': provider }
            : { 'opendatahub.io/vector-db-provider': provider }),
        },
      },
      stringData,
    };

    try {
      if (!createdSecretRef.current) {
        await createSecretMutation.mutateAsync(secret);
        createdSecretRef.current = secret;
      }
      await onSubmit(k8sName);
      onClose();
    } catch (error) {
      setSubmitError(
        createdSecretRef.current
          ? new Error(
              'The connection was created, but AutoRAG could not select it. Retry saving it.',
            )
          : error instanceof Error
            ? error
            : new Error(String(error)),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={isSaving ? undefined : onClose} variant="medium">
      <ModalHeader
        title={`Add ${
          provider === 'milvus' ? 'Milvus' : provider === 'pgvector' ? 'PGVector' : 'Neo4j'
        } connection`}
        description={`Provide connection details for ${
          provider === 'neo4j' ? 'a Graph RAG database.' : 'a vector database.'
        }`}
      />
      <ModalBody>
        <Form>
          {allowedProviders.length > 1 && (
            <FormGroup fieldId="vector-db-provider" label="Vector database type" isRequired>
              {allowedProviders.includes('milvus') && (
                <Radio
                  id="vector-db-provider-milvus"
                  data-testid="vector-db-provider-milvus"
                  name="vector-db-provider"
                  label="Milvus"
                  isChecked={provider === 'milvus'}
                  onChange={() => handleProviderChange('milvus')}
                />
              )}
              {allowedProviders.includes('neo4j') && (
                <Radio
                  id="vector-db-provider-neo4j"
                  data-testid="vector-db-provider-neo4j"
                  name="vector-db-provider"
                  label="Neo4j"
                  isChecked={provider === 'neo4j'}
                  onChange={() => handleProviderChange('neo4j')}
                />
              )}
              {allowedProviders.includes('pgvector') && (
                <Radio
                  id="vector-db-provider-pgvector"
                  data-testid="vector-db-provider-pgvector"
                  name="vector-db-provider"
                  label="PGVector"
                  isChecked={provider === 'pgvector'}
                  onChange={() => handleProviderChange('pgvector')}
                />
              )}
            </FormGroup>
          )}
          <K8sNameDescriptionField
            dataTestId="vector-db-connection"
            data={nameDescData}
            onDataChange={setNameDescData}
            nameLabel="Connection name"
            hideDescription
          />
          {provider === 'milvus' && (
            <>
              <FormGroup fieldId="milvus-uri" label="URI" isRequired>
                <TextInput
                  id="milvus-uri"
                  data-testid="milvus-uri-input"
                  value={uri}
                  onChange={(_event, value) => setField('MILVUS_URI', value)}
                  aria-describedby={getDescribedBy('milvus-uri', !!getFieldError('MILVUS_URI'))}
                  validated={getFieldError('MILVUS_URI') ? 'error' : 'default'}
                />
                <FieldHelperText id="milvus-uri-description">
                  Milvus server endpoint, including protocol and port (for example:
                  &quot;http://localhost:19530&quot; or
                  &quot;https://milvus.example.com:19530&quot;).
                </FieldHelperText>
                {getFieldError('MILVUS_URI') && (
                  <FieldHelperText id="milvus-uri-error" variant="error">
                    {getFieldError('MILVUS_URI')}
                  </FieldHelperText>
                )}
              </FormGroup>
              <FormGroup fieldId="milvus-token" label="Token">
                <PasswordInput
                  id="milvus-token"
                  data-testid="milvus-token-input"
                  value={getField('MILVUS_TOKEN')}
                  onChange={(_event, value) => setField('MILVUS_TOKEN', value)}
                  ariaLabelShow="Show token"
                  ariaLabelHide="Hide token"
                  aria-describedby={getDescribedBy('milvus-token', !!getFieldError('MILVUS_TOKEN'))}
                  validated={getFieldError('MILVUS_TOKEN') ? 'error' : 'default'}
                />
                <FieldHelperText id="milvus-token-description">
                  Authentication token in the format &quot;username:password&quot;. Leave blank if
                  authentication is disabled.
                </FieldHelperText>
                {getFieldError('MILVUS_TOKEN') && (
                  <FieldHelperText id="milvus-token-error" variant="error">
                    {getFieldError('MILVUS_TOKEN')}
                  </FieldHelperText>
                )}
              </FormGroup>
              <FormGroup fieldId="milvus-ca-cert" label="CA certificate">
                <TextArea
                  id="milvus-ca-cert"
                  data-testid="milvus-ca-cert-input"
                  value={getField('MILVUS_CA_CERT')}
                  onChange={(_event, value) => setField('MILVUS_CA_CERT', value)}
                  aria-describedby={getDescribedBy(
                    'milvus-ca-cert',
                    !!getFieldError('MILVUS_CA_CERT'),
                  )}
                  validated={getFieldError('MILVUS_CA_CERT') ? 'error' : 'default'}
                />
                <FieldHelperText id="milvus-ca-cert-description">
                  {CA_CERTIFICATE_GUIDANCE}
                </FieldHelperText>
                {getFieldError('MILVUS_CA_CERT') && (
                  <FieldHelperText id="milvus-ca-cert-error" variant="error">
                    {getFieldError('MILVUS_CA_CERT')}
                  </FieldHelperText>
                )}
              </FormGroup>
            </>
          )}
          {provider === 'pgvector' &&
            ['HOST', 'PORT', 'DB', 'USER', 'PASSWORD'].map((fieldName) => {
              const key = `PGVECTOR_${fieldName}`;
              return (
                <FormGroup
                  key={key}
                  fieldId={key.toLowerCase()}
                  label={
                    {
                      HOST: 'Host',
                      PORT: 'Port',
                      DB: 'Database',
                      USER: 'Username',
                      PASSWORD: 'Password',
                    }[fieldName]
                  }
                  isRequired
                >
                  <TextInput
                    id={key.toLowerCase()}
                    data-testid={`pgvector-${fieldName.toLowerCase()}-input`}
                    type={
                      fieldName === 'PASSWORD'
                        ? 'password'
                        : fieldName === 'PORT'
                          ? 'number'
                          : 'text'
                    }
                    value={getField(key)}
                    onChange={(_event, value) => setField(key, value)}
                    aria-describedby={getDescribedBy(key.toLowerCase(), !!getFieldError(key))}
                    validated={getFieldError(key) ? 'error' : 'default'}
                  />
                  <FieldHelperText id={`${key.toLowerCase()}-description`}>
                    {
                      {
                        HOST: 'PostgreSQL server hostname or IP address (for example: "db.example.com" or "10.0.0.5").',
                        PORT: 'PostgreSQL port number. Usually "5432" unless your provider specifies a different port.',
                        DB: 'Name of the PostgreSQL database that contains your pgvector tables and embeddings.',
                        USER: 'PostgreSQL user account used to connect to the database.',
                        PASSWORD: 'Password for the PostgreSQL user account.',
                      }[fieldName]
                    }
                  </FieldHelperText>
                  {getFieldError(key) && (
                    <FieldHelperText id={`${key.toLowerCase()}-error`} variant="error">
                      {getFieldError(key)}
                    </FieldHelperText>
                  )}
                </FormGroup>
              );
            })}
          {provider === 'pgvector' && (
            <>
              <FormGroup fieldId="pgvector-ca-cert" label="CA certificate">
                <TextArea
                  id="pgvector-ca-cert"
                  data-testid="pgvector-ca-cert-input"
                  value={getField('PGVECTOR_CA_CERT')}
                  onChange={(_event, value) => setField('PGVECTOR_CA_CERT', value)}
                  aria-describedby={getDescribedBy(
                    'pgvector-ca-cert',
                    !!getFieldError('PGVECTOR_CA_CERT'),
                  )}
                  validated={getFieldError('PGVECTOR_CA_CERT') ? 'error' : 'default'}
                />
                <FieldHelperText id="pgvector-ca-cert-description">
                  {CA_CERTIFICATE_GUIDANCE}
                </FieldHelperText>
                {getFieldError('PGVECTOR_CA_CERT') && (
                  <FieldHelperText id="pgvector-ca-cert-error" variant="error">
                    {getFieldError('PGVECTOR_CA_CERT')}
                  </FieldHelperText>
                )}
              </FormGroup>
            </>
          )}
          {provider === 'neo4j' && (
            <>
              <FormGroup fieldId="neo4j-uri" label="URI" isRequired>
                <TextInput
                  id="neo4j-uri"
                  data-testid="neo4j-uri-input"
                  value={uri}
                  onChange={(_event, value) => setField('NEO4J_URI', value)}
                  aria-describedby={getDescribedBy('neo4j-uri', !!getFieldError('NEO4J_URI'))}
                  validated={getFieldError('NEO4J_URI') ? 'error' : 'default'}
                />
                <FieldHelperText id="neo4j-uri-description">
                  Neo4j connection URI, including protocol and host (for example:
                  &quot;neo4j+s://example.databases.neo4j.io&quot; or
                  &quot;bolt://localhost:7687&quot;).
                </FieldHelperText>
                {getFieldError('NEO4J_URI') && (
                  <FieldHelperText id="neo4j-uri-error" variant="error">
                    {getFieldError('NEO4J_URI')}
                  </FieldHelperText>
                )}
              </FormGroup>
              {NEO4J_OPTIONAL_FIELDS.map(({ key, label, type, guidance }) => (
                <FormGroup key={key} fieldId={key.toLowerCase()} label={label}>
                  <TextInput
                    id={key.toLowerCase()}
                    data-testid={`neo4j-${key.replace('NEO4J_', '').toLowerCase()}-input`}
                    type={type}
                    value={getField(key)}
                    onChange={(_event, value) => setField(key, value)}
                    aria-describedby={`${key.toLowerCase()}-description`}
                  />
                  <FieldHelperText id={`${key.toLowerCase()}-description`}>
                    {guidance}
                  </FieldHelperText>
                </FormGroup>
              ))}
              <FormGroup fieldId="neo4j-password" label="Password" isRequired>
                <TextInput
                  id="neo4j-password"
                  data-testid="neo4j-password-input"
                  type="password"
                  value={getField('NEO4J_PASSWORD')}
                  onChange={(_event, value) => setField('NEO4J_PASSWORD', value)}
                  aria-describedby={getDescribedBy(
                    'neo4j-password',
                    !!getFieldError('NEO4J_PASSWORD'),
                  )}
                  validated={getFieldError('NEO4J_PASSWORD') ? 'error' : 'default'}
                />
                <FieldHelperText id="neo4j-password-description">
                  Password for the specified Neo4j user account.
                </FieldHelperText>
                {getFieldError('NEO4J_PASSWORD') && (
                  <FieldHelperText id="neo4j-password-error" variant="error">
                    {getFieldError('NEO4J_PASSWORD')}
                  </FieldHelperText>
                )}
              </FormGroup>
              <FormGroup fieldId="neo4j-ca-cert" label="CA certificate">
                <TextArea
                  id="neo4j-ca-cert"
                  data-testid="neo4j-ca-cert-input"
                  value={getField('NEO4J_CA_CERT')}
                  onChange={(_event, value) => setField('NEO4J_CA_CERT', value)}
                  aria-describedby={getDescribedBy(
                    'neo4j-ca-cert',
                    !!getFieldError('NEO4J_CA_CERT'),
                  )}
                  validated={getFieldError('NEO4J_CA_CERT') ? 'error' : 'default'}
                />
                <FieldHelperText id="neo4j-ca-cert-description">
                  {CA_CERTIFICATE_GUIDANCE}
                </FieldHelperText>
                {getFieldError('NEO4J_CA_CERT') && (
                  <FieldHelperText id="neo4j-ca-cert-error" variant="error">
                    {getFieldError('NEO4J_CA_CERT')}
                  </FieldHelperText>
                )}
              </FormGroup>
            </>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Add connection"
          onCancel={onClose}
          onSubmit={handleSubmit}
          error={submitError}
          isSubmitDisabled={!isFormValid || isSaving}
          isCancelDisabled={isSaving}
          isSubmitLoading={isSaving}
          alertTitle="Failed to create database connection"
        />
      </ModalFooter>
    </Modal>
  );
};

export default VectorDbConnectionModal;
