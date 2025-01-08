import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Spinner,
  TextInput,
} from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ModelRegistryKind } from '~/k8sTypes';
import { ModelRegistryModel } from '~/api';
import {
  createModelRegistryBackend,
  updateModelRegistryBackend,
} from '~/services/modelRegistrySettingsService';
import { isValidK8sName, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import FormSection from '~/components/pf-overrides/FormSection';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import useModelRegistryCertificateNames from '~/concepts/modelRegistrySettings/useModelRegistryCertificateNames';
import { CreateMRSecureDBSection, SecureDBInfo, SecureDBRType } from './CreateMRSecureDBSection';
import ModelRegistryDatabasePassword from './ModelRegistryDatabasePassword';

type CreateModalProps = {
  onClose: () => void;
  refresh: () => Promise<unknown>;
  modelRegistry?: ModelRegistryKind;
};

const CreateModal: React.FC<CreateModalProps> = ({ onClose, refresh, modelRegistry: mr }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { data: nameDesc, onDataChange: setNameDesc } = useK8sNameDescriptionFieldData({
    initialData: mr,
  });
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [database, setDatabase] = React.useState('');
  const [addSecureDB, setAddSecureDB] = React.useState(false);
  const [secureDBInfo, setSecureDBInfo] = React.useState<SecureDBInfo>({
    type: SecureDBRType.CLUSTER_WIDE,
    nameSpace: '',
    configMap: '',
    certificate: '',
    key: '',
    isValid: true,
  });
  const [isHostTouched, setIsHostTouched] = React.useState(false);
  const [isPortTouched, setIsPortTouched] = React.useState(false);
  const [isUsernameTouched, setIsUsernameTouched] = React.useState(false);
  const [isPasswordTouched, setIsPasswordTouched] = React.useState(false);
  const [isDatabaseTouched, setIsDatabaseTouched] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { dscStatus } = React.useContext(AreaContext);
  const secureDbEnabled = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY_SECURE_DB).status;
  const [configSecrets, configSecretsLoaded, configSecretsError] = useModelRegistryCertificateNames(
    !addSecureDB,
  );

  const modelRegistryNamespace = dscStatus?.components?.modelregistry?.registriesNamespace || '';

  React.useEffect(() => {
    if (mr) {
      const dbSpec = mr.spec.mysql || mr.spec.postgres;
      setHost(dbSpec?.host || 'Unknown');
      setPort(dbSpec?.port?.toString() || 'Unknown');
      setUsername(dbSpec?.username || 'Unknown');
      setDatabase(dbSpec?.database || 'Unknown');
    }
  }, [mr]);

  const onBeforeClose = () => {
    setIsSubmitting(false);
    setError(undefined);

    setHost('');
    setPort('');
    setUsername('');
    setPassword('');
    setDatabase('');
    setIsHostTouched(false);
    setIsPortTouched(false);
    setIsUsernameTouched(false);
    setIsPasswordTouched(false);
    setIsDatabaseTouched(false);
    setShowPassword(false);
    onClose();
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(undefined);

    if (mr) {
      try {
        await updateModelRegistryBackend(mr.metadata.name, {
          modelRegistry: {
            metadata: {
              annotations: {
                'openshift.io/description': nameDesc.description,
                'openshift.io/display-name': nameDesc.name.trim(),
              },
            },
            spec: {
              mysql: {
                host,
                port: Number(port),
                database,
                username,
              },
            },
          },
          databasePassword: password,
        });
        await refresh();
        onBeforeClose();
      } catch (e) {
        if (e instanceof Error) {
          setError(e);
        }
        setIsSubmitting(false);
      }
    } else {
      const data: ModelRegistryKind = {
        apiVersion: `${ModelRegistryModel.apiGroup}/${ModelRegistryModel.apiVersion}`,
        kind: 'ModelRegistry',
        metadata: {
          name: nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name),
          namespace: dscStatus?.components?.modelregistry?.registriesNamespace || '',
          annotations: {
            'openshift.io/description': nameDesc.description,
            'openshift.io/display-name': nameDesc.name.trim(),
          },
        },
        spec: {
          grpc: {},
          rest: {},
          istio: {
            gateway: {
              grpc: { tls: {} },
              rest: { tls: {} },
            },
          },
          mysql: {
            host,
            port: Number(port),
            database,
            username,
            skipDBCreation: false,
          },
        },
      };
      try {
        await createModelRegistryBackend({ modelRegistry: data, databasePassword: password });
        await refresh();
        onBeforeClose();
      } catch (e) {
        if (e instanceof Error) {
          setError(e);
        }
        setIsSubmitting(false);
      }
    }
  };

  const hasContent = (value: string): boolean => !!value.trim().length;

  const canSubmit = () =>
    !isSubmitting &&
    isValidK8sName(nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name)) &&
    hasContent(host) &&
    hasContent(password) &&
    hasContent(port) &&
    hasContent(username) &&
    hasContent(database) &&
    (!addSecureDB || secureDBInfo.isValid);

  return (
    <Modal
      isOpen
      title={`${mr ? 'Edit' : 'Create'} model registry`}
      onClose={onBeforeClose}
      actions={[
        <Button key="create-button" variant="primary" isDisabled={!canSubmit()} onClick={onSubmit}>
          Create
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={onBeforeClose}>
          Cancel
        </Button>,
      ]}
      variant="medium"
      footer={
        <DashboardModalFooter
          onCancel={onBeforeClose}
          onSubmit={onSubmit}
          submitLabel={mr ? 'Update' : 'Create'}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle={`Error ${mr ? 'updating' : 'creating'} model registry`}
        />
      }
    >
      <Form>
        <K8sNameDescriptionField dataTestId="mr" data={nameDesc} onDataChange={setNameDesc} />
        <FormSection
          title={mr ? 'Database' : 'Connect to external MySQL database'}
          description="This external database is where model data is stored."
        >
          <FormGroup label="Host" isRequired fieldId="mr-host">
            <TextInput
              isRequired
              type="text"
              id="mr-host"
              name="mr-host"
              value={host}
              onBlur={() => setIsHostTouched(true)}
              onChange={(_e, value) => setHost(value)}
              validated={isHostTouched && !hasContent(host) ? 'error' : 'default'}
            />
            {isHostTouched && !hasContent(host) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-host-error">
                  Host cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Port" isRequired fieldId="mr-port">
            <TextInput
              isRequired
              type="text"
              id="mr-port"
              name="mr-port"
              value={port}
              onBlur={() => setIsPortTouched(true)}
              onChange={(_e, value) => setPort(value)}
              validated={isPortTouched && !hasContent(port) ? 'error' : 'default'}
            />
            {isPortTouched && !hasContent(port) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-port-error">
                  Port cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Username" isRequired fieldId="mr-username">
            <TextInput
              isRequired
              type="text"
              id="mr-username"
              name="mr-username"
              value={username}
              onBlur={() => setIsUsernameTouched(true)}
              onChange={(_e, value) => setUsername(value)}
              validated={isUsernameTouched && !hasContent(username) ? 'error' : 'default'}
            />
            {isUsernameTouched && !hasContent(username) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-username-error">
                  Username cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          <FormGroup label="Password" isRequired fieldId="mr-password">
            <ModelRegistryDatabasePassword
              password={password || ''}
              setPassword={setPassword}
              isPasswordTouched={isPasswordTouched}
              setIsPasswordTouched={setIsPasswordTouched}
              showPassword={showPassword}
              editRegistry={mr}
            />
          </FormGroup>
          <FormGroup label="Database" isRequired fieldId="mr-database">
            <TextInput
              isRequired
              type="text"
              id="mr-database"
              name="mr-database"
              value={database}
              onBlur={() => setIsDatabaseTouched(true)}
              onChange={(_e, value) => setDatabase(value)}
              validated={isDatabaseTouched && !hasContent(database) ? 'error' : 'default'}
            />
            {isDatabaseTouched && !hasContent(database) && (
              <HelperText>
                <HelperTextItem variant="error" data-testid="mr-database-error">
                  Database cannot be empty
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
          {secureDbEnabled && (
            <>
              <FormGroup>
                <Checkbox
                  label="Add CA certificate to secure database connection"
                  isChecked={addSecureDB}
                  onChange={(_e, value) => setAddSecureDB(value)}
                  id="add-secure-db"
                  data-testid="add-secure-db-mr-checkbox"
                  name="add-secure-db"
                />
              </FormGroup>
              {addSecureDB &&
                (!configSecretsLoaded && !configSecretsError ? (
                  <EmptyState icon={Spinner} />
                ) : configSecretsLoaded ? (
                  <CreateMRSecureDBSection
                    secureDBInfo={secureDBInfo}
                    modelRegistryNamespace={modelRegistryNamespace}
                    nameDesc={nameDesc}
                    existingCertConfigMaps={configSecrets.configMaps}
                    existingCertSecrets={configSecrets.secrets}
                    setSecureDBInfo={setSecureDBInfo}
                  />
                ) : (
                  <Alert isInline variant="danger" title="Error fetching config maps and secrets">
                    {configSecretsError?.message}
                  </Alert>
                ))}
            </>
          )}
        </FormSection>
      </Form>
    </Modal>
  );
};

export default CreateModal;
