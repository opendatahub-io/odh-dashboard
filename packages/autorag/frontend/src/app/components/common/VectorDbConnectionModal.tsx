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
}> = [
  { key: 'NEO4J_USERNAME', label: 'Username', type: 'text' },
  { key: 'NEO4J_DATABASE', label: 'Database', type: 'text' },
];

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
                  validated={getFieldError('MILVUS_URI') ? 'error' : 'default'}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={getFieldError('MILVUS_URI') ? 'error' : 'default'}>
                      {getFieldError('MILVUS_URI') || 'The Milvus service URI.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup fieldId="milvus-token" label="Token">
                <PasswordInput
                  id="milvus-token"
                  data-testid="milvus-token-input"
                  value={getField('MILVUS_TOKEN')}
                  onChange={(_event, value) => setField('MILVUS_TOKEN', value)}
                  ariaLabelShow="Show token"
                  ariaLabelHide="Hide token"
                  validated={getFieldError('MILVUS_TOKEN') ? 'error' : 'default'}
                />
                {getFieldError('MILVUS_TOKEN') && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {getFieldError('MILVUS_TOKEN')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>
              <FormGroup fieldId="milvus-ca-cert" label="CA certificate">
                <TextArea
                  id="milvus-ca-cert"
                  data-testid="milvus-ca-cert-input"
                  value={getField('MILVUS_CA_CERT')}
                  onChange={(_event, value) => setField('MILVUS_CA_CERT', value)}
                  validated={getFieldError('MILVUS_CA_CERT') ? 'error' : 'default'}
                />
                {getFieldError('MILVUS_CA_CERT') && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {getFieldError('MILVUS_CA_CERT')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Example Secret: MILVUS_URI=https://milvus.example.com, with optional
                    MILVUS_TOKEN and MILVUS_CA_CERT. The CA certificate verifies TLS connections;
                    enter certificate text as-is.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
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
                    validated={getFieldError(key) ? 'error' : 'default'}
                  />
                  {getFieldError(key) && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem variant="error">{getFieldError(key)}</HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                  {fieldName === 'HOST' && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Hostname or IP address of the PostgreSQL server.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
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
                  validated={getFieldError('PGVECTOR_CA_CERT') ? 'error' : 'default'}
                />
                {getFieldError('PGVECTOR_CA_CERT') && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {getFieldError('PGVECTOR_CA_CERT')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Example Secret: PGVECTOR_HOST=postgres.example.com, PGVECTOR_PORT=5432,
                    PGVECTOR_DB=rag, PGVECTOR_USER=rag-user, and PGVECTOR_PASSWORD=&lt;password&gt;,
                    with optional PGVECTOR_CA_CERT. The CA certificate verifies TLS connections;
                    enter certificate text as-is.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
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
                  validated={getFieldError('NEO4J_URI') ? 'error' : 'default'}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={getFieldError('NEO4J_URI') ? 'error' : 'default'}>
                      {getFieldError('NEO4J_URI') ||
                        'The Neo4j service URI (neo4j://, neo4j+s://, bolt://, or bolt+s://).'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              {NEO4J_OPTIONAL_FIELDS.map(({ key, label, type }) => (
                <FormGroup key={key} fieldId={key.toLowerCase()} label={label}>
                  <TextInput
                    id={key.toLowerCase()}
                    data-testid={`neo4j-${key.replace('NEO4J_', '').toLowerCase()}-input`}
                    type={type}
                    value={getField(key)}
                    onChange={(_event, value) => setField(key, value)}
                  />
                </FormGroup>
              ))}
              <FormGroup fieldId="neo4j-password" label="Password" isRequired>
                <TextInput
                  id="neo4j-password"
                  data-testid="neo4j-password-input"
                  type="password"
                  value={getField('NEO4J_PASSWORD')}
                  onChange={(_event, value) => setField('NEO4J_PASSWORD', value)}
                  validated={getFieldError('NEO4J_PASSWORD') ? 'error' : 'default'}
                />
                {getFieldError('NEO4J_PASSWORD') && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {getFieldError('NEO4J_PASSWORD')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>
              <FormGroup fieldId="neo4j-ca-cert" label="CA certificate">
                <TextArea
                  id="neo4j-ca-cert"
                  data-testid="neo4j-ca-cert-input"
                  value={getField('NEO4J_CA_CERT')}
                  onChange={(_event, value) => setField('NEO4J_CA_CERT', value)}
                  validated={getFieldError('NEO4J_CA_CERT') ? 'error' : 'default'}
                />
                {getFieldError('NEO4J_CA_CERT') && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {getFieldError('NEO4J_CA_CERT')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Example Secret: NEO4J_URI=neo4j://neo4j.example.com:7687 and
                    NEO4J_PASSWORD=&lt;password&gt;, with optional NEO4J_USERNAME, NEO4J_DATABASE,
                    and NEO4J_CA_CERT. Omitted username defaults to neo4j and omitted database
                    defaults to the server default. The CA certificate verifies TLS connections;
                    enter certificate text as-is.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
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
