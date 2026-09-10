import React from 'react';
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
import PasswordInput from '@odh-dashboard/internal/components/PasswordInput';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { createSecret } from '@odh-dashboard/k8s-core/api/secrets';
import { isK8sNameDescriptionDataValid, KnownLabels } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import {
  buildVectorDbStringData,
  isValidHttpUrl,
  isValidPostgresPort,
  isVectorDbFormValid,
  type VectorDbBackend,
  type VectorDbSecretInput,
} from '~/app/utilities/vectorDbSecret';

type Props = {
  namespace: string;
  onClose: () => void;
  onSubmit: (secretName: string) => void | Promise<void>;
  initialBackend?: VectorDbBackend;
};

const VectorDbConnectionModal: React.FC<Props> = ({
  namespace,
  onClose,
  onSubmit,
  initialBackend = 'milvus',
}) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [backend, setBackend] = React.useState<VectorDbBackend>(initialBackend);
  const [milvusUri, setMilvusUri] = React.useState('');
  const [milvusToken, setMilvusToken] = React.useState('');
  const [milvusServerCert, setMilvusServerCert] = React.useState('');
  const [pgHost, setPgHost] = React.useState('');
  const [pgPort, setPgPort] = React.useState('5432');
  const [pgDatabase, setPgDatabase] = React.useState('');
  const [pgUser, setPgUser] = React.useState('');
  const [pgPassword, setPgPassword] = React.useState('');
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [milvusUriTouched, setMilvusUriTouched] = React.useState(false);
  const [pgPortTouched, setPgPortTouched] = React.useState(false);

  const milvusUriValid = isValidHttpUrl(milvusUri);
  const showMilvusUriError = milvusUriTouched && milvusUri.trim() !== '' && !milvusUriValid;
  const pgPortValid = isValidPostgresPort(pgPort);
  const showPgPortError = pgPortTouched && pgPort.trim() !== '' && !pgPortValid;

  const secretInput: VectorDbSecretInput =
    backend === 'milvus'
      ? {
          backend: 'milvus',
          fields: { uri: milvusUri, token: milvusToken, serverCert: milvusServerCert },
        }
      : {
          backend: 'pgvector',
          fields: {
            host: pgHost,
            port: pgPort,
            database: pgDatabase,
            user: pgUser,
            password: pgPassword,
          },
        };

  const isFormValid =
    isK8sNameDescriptionDataValid(nameDescData) && isVectorDbFormValid(secretInput);

  const handleSubmit = async () => {
    setIsSaving(true);
    setSubmitError(undefined);

    const k8sName = nameDescData.k8sName.value;
    const secret: SecretKind = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: k8sName,
        namespace,
        annotations: {
          'openshift.io/display-name': nameDescData.name.trim(),
          'opendatahub.io/connection-type': backend,
        },
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        },
      },
      stringData: buildVectorDbStringData(secretInput),
    };

    try {
      await createSecret(secret);
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error(String(e)));
      setIsSaving(false);
      return;
    }

    try {
      await onSubmit(k8sName);
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  const title = backend === 'milvus' ? 'Add Milvus connection' : 'Add PGVector connection';

  return (
    <Modal isOpen onClose={isSaving ? undefined : onClose} variant="medium">
      <ModalHeader
        title={title}
        description="Provide connection details for a vector database. The pipeline reads MILVUS_* or PGVECTOR_* keys from the created secret."
      />
      <ModalBody>
        <Form data-testid="vector-db-connection-modal">
          <FormGroup fieldId="vector-db-backend" label="Vector database type" isRequired>
            <div role="radiogroup" aria-label="Vector database type">
              <Radio
                id="vector-db-backend-milvus"
                data-testid="vector-db-backend-milvus"
                name="vector-db-backend"
                label="Milvus"
                isChecked={backend === 'milvus'}
                onChange={() => setBackend('milvus')}
              />
              <Radio
                id="vector-db-backend-pgvector"
                data-testid="vector-db-backend-pgvector"
                name="vector-db-backend"
                label="PGVector"
                isChecked={backend === 'pgvector'}
                onChange={() => setBackend('pgvector')}
              />
            </div>
          </FormGroup>
          <K8sNameDescriptionField
            dataTestId="vector-db-connection"
            data={nameDescData}
            onDataChange={setNameDescData}
            nameLabel="Connection name"
            hideDescription
          />
          {backend === 'milvus' ? (
            <>
              <FormGroup fieldId="vector-db-milvus-uri" label="URI" isRequired>
                <TextInput
                  id="vector-db-milvus-uri"
                  data-testid="vector-db-milvus-uri"
                  value={milvusUri}
                  onChange={(_e, val) => setMilvusUri(val)}
                  onBlur={() => {
                    setMilvusUriTouched(true);
                    setMilvusUri((prev) => prev.trim());
                  }}
                  maxLength={2048}
                  validated={showMilvusUriError ? 'error' : 'default'}
                  isRequired
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={showMilvusUriError ? 'error' : 'default'}>
                      {showMilvusUriError
                        ? 'Enter a valid URL (e.g. https://example.com).'
                        : 'Connection URI to the Milvus instance.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup fieldId="vector-db-milvus-token" label="Token">
                <PasswordInput
                  id="vector-db-milvus-token"
                  data-testid="vector-db-milvus-token"
                  value={milvusToken}
                  onChange={(_e, val) => setMilvusToken(val)}
                  ariaLabelShow="Show token"
                  ariaLabelHide="Hide token"
                />
              </FormGroup>
              <FormGroup fieldId="vector-db-milvus-server-cert" label="Server certificate">
                <TextArea
                  id="vector-db-milvus-server-cert"
                  data-testid="vector-db-milvus-server-cert"
                  value={milvusServerCert}
                  onChange={(_e, val) => setMilvusServerCert(val)}
                  resizeOrientation="vertical"
                  rows={4}
                />
              </FormGroup>
            </>
          ) : (
            <>
              <FormGroup fieldId="vector-db-pgvector-host" label="Host" isRequired>
                <TextInput
                  id="vector-db-pgvector-host"
                  data-testid="vector-db-pgvector-host"
                  value={pgHost}
                  onChange={(_e, val) => setPgHost(val)}
                  isRequired
                />
              </FormGroup>
              <FormGroup fieldId="vector-db-pgvector-port" label="Port" isRequired>
                <TextInput
                  id="vector-db-pgvector-port"
                  data-testid="vector-db-pgvector-port"
                  value={pgPort}
                  onChange={(_e, val) => setPgPort(val)}
                  onBlur={() => setPgPortTouched(true)}
                  validated={showPgPortError ? 'error' : 'default'}
                  isRequired
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={showPgPortError ? 'error' : 'default'}>
                      {showPgPortError
                        ? 'Enter a port between 1 and 65535.'
                        : 'PostgreSQL server port.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup fieldId="vector-db-pgvector-db" label="Database" isRequired>
                <TextInput
                  id="vector-db-pgvector-db"
                  data-testid="vector-db-pgvector-db"
                  value={pgDatabase}
                  onChange={(_e, val) => setPgDatabase(val)}
                  isRequired
                />
              </FormGroup>
              <FormGroup fieldId="vector-db-pgvector-user" label="User" isRequired>
                <TextInput
                  id="vector-db-pgvector-user"
                  data-testid="vector-db-pgvector-user"
                  value={pgUser}
                  onChange={(_e, val) => setPgUser(val)}
                  isRequired
                />
              </FormGroup>
              <FormGroup fieldId="vector-db-pgvector-password" label="Password" isRequired>
                <PasswordInput
                  id="vector-db-pgvector-password"
                  data-testid="vector-db-pgvector-password"
                  value={pgPassword}
                  onChange={(_e, val) => setPgPassword(val)}
                  ariaLabelShow="Show password"
                  ariaLabelHide="Hide password"
                />
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
          alertTitle="Failed to create connection"
        />
      </ModalFooter>
    </Modal>
  );
};

export default VectorDbConnectionModal;
