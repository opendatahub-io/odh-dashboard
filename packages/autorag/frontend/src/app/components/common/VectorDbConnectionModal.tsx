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
import { createSecret } from '@odh-dashboard/k8s-core/api/secrets';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';

type Props = {
  namespace: string;
  initialProvider?: Provider;
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
};

type Provider = 'milvus' | 'pgvector';

const isValidUri = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const VectorDbConnectionModal: React.FC<Props> = ({
  namespace,
  initialProvider = 'milvus',
  onClose,
  onSubmit,
}) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [provider, setProvider] = React.useState<Provider>(initialProvider);
  const [fields, setFields] = React.useState<Partial<Record<string, string>>>({});
  const [uriTouched, setUriTouched] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);

  const getField = (key: string): string => fields[key] ?? '';
  const uri = getField('MILVUS_URI');
  const uriValid = isValidUri(uri);
  const showUriError = uriTouched && uri.trim() !== '' && !uriValid;
  const isFormValid = Boolean(
    isK8sNameDescriptionDataValid(nameDescData) &&
    (provider === 'milvus'
      ? uriValid
      : [
          'PGVECTOR_HOST',
          'PGVECTOR_PORT',
          'PGVECTOR_DB',
          'PGVECTOR_USER',
          'PGVECTOR_PASSWORD',
        ].every((key) => getField(key).trim() !== '')),
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

    const secret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: k8sName,
        namespace,
        annotations: {
          'openshift.io/display-name': nameDescData.name.trim(),
          'opendatahub.io/connection-type': 'vector-db',
          'opendatahub.io/vector-db-provider': provider,
        },
      },
      stringData,
    };

    try {
      await createSecret(secret);
      await onSubmit(k8sName);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={isSaving ? undefined : onClose} variant="medium">
      <ModalHeader
        title={`Add ${provider === 'milvus' ? 'Milvus' : 'PGVector'} connection`}
        description="Provide connection details for a vector database."
      />
      <ModalBody>
        <Form>
          <FormGroup fieldId="vector-db-provider" label="Vector database type" isRequired>
            <Radio
              id="vector-db-provider-milvus"
              data-testid="vector-db-provider-milvus"
              name="vector-db-provider"
              label="Milvus"
              isChecked={provider === 'milvus'}
              onChange={() => handleProviderChange('milvus')}
            />
            <Radio
              id="vector-db-provider-pgvector"
              data-testid="vector-db-provider-pgvector"
              name="vector-db-provider"
              label="PGVector"
              isChecked={provider === 'pgvector'}
              onChange={() => handleProviderChange('pgvector')}
            />
          </FormGroup>
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
          alertTitle="Failed to create vector database connection"
        />
      </ModalFooter>
    </Modal>
  );
};

export default VectorDbConnectionModal;
