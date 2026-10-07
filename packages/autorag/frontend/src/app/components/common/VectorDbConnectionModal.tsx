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

type Props = {
  namespace: string;
  initialProvider?: Provider;
  allowedProviders?: readonly Provider[];
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
};

type Provider = 'milvus' | 'pgvector' | 'neo4j';

const isValidUri = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidNeo4jUri = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return (
      Boolean(parsed.hostname) &&
      ['neo4j:', 'neo4j+s:', 'bolt:', 'bolt+s:'].includes(parsed.protocol)
    );
  } catch {
    return false;
  }
};

const isValidPgVectorPort = (value: string): boolean => {
  if (!/^\d+$/.test(value.trim())) {
    return false;
  }
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
};

const NEO4J_OPTIONAL_FIELDS: ReadonlyArray<{
  key: 'NEO4J_USERNAME' | 'NEO4J_PASSWORD' | 'NEO4J_DATABASE';
  label: string;
  type: 'text' | 'password';
}> = [
  { key: 'NEO4J_USERNAME', label: 'Username', type: 'text' },
  { key: 'NEO4J_PASSWORD', label: 'Password', type: 'password' },
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
  const [fields, setFields] = React.useState<Partial<Record<string, string>>>({});
  const [uriTouched, setUriTouched] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const createdSecretRef = React.useRef<SecretKind>();
  const createSecretMutation = useCreateSecretMutation();

  const getField = (key: string): string => fields[key] ?? '';
  const uri = getField(provider === 'neo4j' ? 'NEO4J_URI' : 'MILVUS_URI');
  const uriValid = provider === 'neo4j' ? isValidNeo4jUri(uri) : isValidUri(uri);
  const showUriError = uriTouched && uri.trim() !== '' && !uriValid;
  const pgVectorPortValid = isValidPgVectorPort(getField('PGVECTOR_PORT'));
  const isFormValid = Boolean(
    isK8sNameDescriptionDataValid(nameDescData) &&
    (provider === 'milvus'
      ? uriValid
      : provider === 'neo4j'
        ? uriValid
        : [
            'PGVECTOR_HOST',
            'PGVECTOR_PORT',
            'PGVECTOR_DB',
            'PGVECTOR_USER',
            'PGVECTOR_PASSWORD',
          ].every((key) => getField(key).trim() !== '') && pgVectorPortValid),
  );

  const setField = (key: string, value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const handleProviderChange = (nextProvider: Provider) => {
    setProvider(nextProvider);
    setFields({});
    setUriTouched(false);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setSubmitError(undefined);
    const k8sName = nameDescData.k8sName.value;
    const stringData: Record<string, string> =
      provider === 'milvus'
        ? { MILVUS_URI: getField('MILVUS_URI').trim() }
        : provider === 'neo4j'
          ? { NEO4J_URI: getField('NEO4J_URI').trim() }
          : {
              PGVECTOR_HOST: getField('PGVECTOR_HOST').trim(),
              PGVECTOR_PORT: getField('PGVECTOR_PORT').trim(),
              PGVECTOR_DB: getField('PGVECTOR_DB').trim(),
              PGVECTOR_USER: getField('PGVECTOR_USER').trim(),
              PGVECTOR_PASSWORD: getField('PGVECTOR_PASSWORD').trim(),
            };
    if (provider === 'milvus') {
      if (getField('MILVUS_TOKEN').trim()) {
        stringData.MILVUS_TOKEN = getField('MILVUS_TOKEN').trim();
      }
      if (getField('MILVUS_SERVER_CERT').trim()) {
        stringData.MILVUS_SERVER_CERT = getField('MILVUS_SERVER_CERT').trim();
      }
    }
    if (provider === 'neo4j') {
      for (const key of ['NEO4J_USERNAME', 'NEO4J_PASSWORD', 'NEO4J_DATABASE'] as const) {
        const value = getField(key);
        if (value.trim()) {
          stringData[key] = key === 'NEO4J_PASSWORD' ? value : value.trim();
        }
      }
    }

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
                  onBlur={() => {
                    setUriTouched(true);
                    setField('MILVUS_URI', uri.trim());
                  }}
                  validated={showUriError ? 'error' : 'default'}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={showUriError ? 'error' : 'default'}>
                      {showUriError
                        ? 'Enter a valid HTTP or HTTPS URI.'
                        : 'The Milvus service URI.'}
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
                />
              </FormGroup>
              <FormGroup fieldId="milvus-server-cert" label="Server certificate">
                <TextArea
                  id="milvus-server-cert"
                  data-testid="milvus-server-cert-input"
                  value={getField('MILVUS_SERVER_CERT')}
                  onChange={(_event, value) => setField('MILVUS_SERVER_CERT', value)}
                />
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
                  />
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
          {provider === 'neo4j' && (
            <>
              <FormGroup fieldId="neo4j-uri" label="URI" isRequired>
                <TextInput
                  id="neo4j-uri"
                  data-testid="neo4j-uri-input"
                  value={uri}
                  onChange={(_event, value) => setField('NEO4J_URI', value)}
                  onBlur={() => {
                    setUriTouched(true);
                    setField('NEO4J_URI', uri.trim());
                  }}
                  validated={showUriError ? 'error' : 'default'}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={showUriError ? 'error' : 'default'}>
                      {showUriError
                        ? 'Enter a valid neo4j://, neo4j+s://, bolt://, or bolt+s:// URI.'
                        : 'The Neo4j service URI (neo4j://, neo4j+s://, bolt://, or bolt+s://).'}
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
