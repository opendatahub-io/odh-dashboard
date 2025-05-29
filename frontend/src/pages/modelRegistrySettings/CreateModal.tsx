import * as React from 'react';
import {
  Alert,
  Bullseye,
  Checkbox,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Spinner,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { ModelRegistryKind } from '~/k8sTypes';
import { ModelRegistryModel } from '~/api';
import {
  createModelRegistryBackend,
  updateModelRegistryBackend,
} from '~/services/modelRegistrySettingsService';
import { isValidK8sName, kindApiVersion, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import FormSection from '~/components/pf-overrides/FormSection';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import useModelRegistryCertificateNames from '~/concepts/modelRegistrySettings/useModelRegistryCertificateNames';
import {
  constructRequestBody,
  findConfigMap,
  findSecureDBType,
  isClusterWideCABundleEnabled,
  isOpenshiftCAbundleEnabled,
} from '~/pages/modelRegistrySettings/utils';
import { RecursivePartial } from '~/typeHelpers';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import ApplicationsPage from '~/pages/ApplicationsPage';
import RedirectErrorState from '~/pages/external/RedirectErrorState';
import { CreateMRSecureDBSection, SecureDBInfo } from './CreateMRSecureDBSection';
import ModelRegistryDatabasePassword from './ModelRegistryDatabasePassword';
import { ResourceType, SecureDBRType } from './const';

type CreateModalProps = {
  onClose: () => void;
  refresh: () => Promise<unknown>;
  modelRegistry?: ModelRegistryKind;
};

const createEventName = 'Model Registry Created';
const updateEventName = 'Model Registry Updated';
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
  const [secureDBInfo, setSecureDBInfo] = React.useState<SecureDBInfo>({
    type: SecureDBRType.CLUSTER_WIDE,
    nameSpace: '',
    resourceName: '',
    certificate: '',
    key: '',
    isValid: true,
  });
  const modelRegistryNamespace = dscStatus?.components?.modelregistry?.registriesNamespace;

  React.useEffect(() => {
    if (configSecretsLoaded && !configSecretsError && !mr) {
      setSecureDBInfo((prev) => ({
        ...prev,
        type: isClusterWideCABundleEnabled(configSecrets.configMaps)
          ? SecureDBRType.CLUSTER_WIDE
          : isOpenshiftCAbundleEnabled(configSecrets.configMaps)
          ? SecureDBRType.OPENSHIFT
          : SecureDBRType.EXISTING,
        isValid: !!(
          isClusterWideCABundleEnabled(configSecrets.configMaps) ||
          isOpenshiftCAbundleEnabled(configSecrets.configMaps)
        ),
      }));
    }
  }, [configSecretsLoaded, configSecrets.configMaps, mr, configSecretsError]);

  React.useEffect(() => {
    if (mr) {
      const dbSpec = mr.spec.mysql || mr.spec.postgres;
      setHost(dbSpec?.host || 'Unknown');
      setPort(dbSpec?.port?.toString() || 'Unknown');
      setUsername(dbSpec?.username || 'Unknown');
      setDatabase(dbSpec?.database || 'Unknown');
      const certificateResourceRef =
        mr.spec.mysql?.sslRootCertificateConfigMap || mr.spec.mysql?.sslRootCertificateSecret;
      if (certificateResourceRef) {
        setAddSecureDB(true);
        const existingInfo = {
          type: findSecureDBType(certificateResourceRef.name, certificateResourceRef.key),
          nameSpace: '',
          key: certificateResourceRef.key,
          resourceName: certificateResourceRef.name,
          resourceType: mr.spec.mysql?.sslRootCertificateSecret
            ? ResourceType.Secret
            : ResourceType.ConfigMap,
          certificate: '',
        };
        setSecureDBInfo({ ...existingInfo, isValid: true });
      }
    }
  }, [mr]);

  if (!modelRegistryNamespace) {
    return (
      <ApplicationsPage loaded empty={false}>
        <RedirectErrorState
          title="Could not load component state"
          errorMessage="No registries namespace could be found"
        />
      </ApplicationsPage>
    );
  }

  const onCancelClose = () => {
    fireFormTrackingEvent(mr ? updateEventName : createEventName, {
      outcome: TrackingOutcome.cancel,
    });
    onBeforeClose();
  };

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

    const newDatabaseCACertificate =
      addSecureDB && secureDBInfo.type === SecureDBRType.NEW ? secureDBInfo.certificate : undefined;

    if (mr) {
      const data: RecursivePartial<ModelRegistryKind> = {
        metadata: {
          annotations: {
            'openshift.io/description': nameDesc.description,
            'openshift.io/display-name': nameDesc.name.trim(),
          },
        },
        spec: {
          oauthProxy: {},
          mysql: {
            host,
            port: Number(port),
            database,
            username,
          },
        },
      };

      try {
        await updateModelRegistryBackend(mr.metadata.name, {
          modelRegistry: constructRequestBody(data, secureDBInfo, addSecureDB),
          databasePassword: password,
          newDatabaseCACertificate,
        });
        await refresh();
        fireFormTrackingEvent(updateEventName, {
          outcome: TrackingOutcome.submit,
          success: true,
        });
        onBeforeClose();
      } catch (e) {
        if (e instanceof Error) {
          setError(e);
          fireFormTrackingEvent(updateEventName, {
            outcome: TrackingOutcome.submit,
            success: false,
            error: e.message,
          });
        }
        setIsSubmitting(false);
      }
    } else {
      const data: ModelRegistryKind = {
        apiVersion: kindApiVersion(ModelRegistryModel),
        kind: 'ModelRegistry',
        metadata: {
          name: nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name),
          namespace: modelRegistryNamespace,
          annotations: {
            'openshift.io/description': nameDesc.description,
            'openshift.io/display-name': nameDesc.name.trim(),
          },
        },
        spec: {
          oauthProxy: {},
          grpc: {},
          rest: {},
          mysql: {
            host,
            port: Number(port),
            database,
            username,
            skipDBCreation: false,
          },
        },
      };

      if (addSecureDB && secureDBInfo.resourceType === ResourceType.Secret && data.spec.mysql) {
        data.spec.mysql.sslRootCertificateSecret = {
          name: secureDBInfo.resourceName,
          key: secureDBInfo.key,
        };
      } else if (addSecureDB && data.spec.mysql) {
        data.spec.mysql.sslRootCertificateConfigMap = findConfigMap(secureDBInfo);
      }

      try {
        await createModelRegistryBackend({
          modelRegistry: data,
          databasePassword: password,
          newDatabaseCACertificate,
        });
        fireFormTrackingEvent(createEventName, {
          outcome: TrackingOutcome.submit,
          success: true,
        });
        await refresh();
        onBeforeClose();
      } catch (e) {
        if (e instanceof Error) {
          setError(e);
          fireFormTrackingEvent(createEventName, {
            outcome: TrackingOutcome.submit,
            success: false,
            error: e.message,
          });
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
    (!addSecureDB || (secureDBInfo.isValid && !configSecretsError));

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium">
      <ModalHeader title={`${mr ? 'Edit' : 'Create'} model registry`} />
      <ModalBody>
        <Form>
          <K8sNameDescriptionField dataTestId="mr" data={nameDesc} onDataChange={setNameDesc} />
          <FormSection
            title="Connect to external MySQL database"
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
                    <Bullseye>
                      <Spinner className="pf-v6-u-m-md" />
                    </Bullseye>
                  ) : configSecretsLoaded ? (
                    <CreateMRSecureDBSection
                      secureDBInfo={secureDBInfo}
                      modelRegistryNamespace={modelRegistryNamespace}
                      k8sName={nameDesc.k8sName.value}
                      existingCertConfigMaps={configSecrets.configMaps}
                      existingCertSecrets={configSecrets.secrets}
                      setSecureDBInfo={setSecureDBInfo}
                    />
                  ) : (
                    <Alert
                      isInline
                      variant="danger"
                      title="Error fetching config maps and secrets"
                      data-testid="error-fetching-resource-alert"
                    >
                      {configSecretsError?.message}
                    </Alert>
                  ))}
              </>
            )}
          </FormSection>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onSubmit}
          submitLabel={mr ? 'Update' : 'Create'}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={!canSubmit()}
          error={error}
          alertTitle={`Error ${mr ? 'updating' : 'creating'} model registry`}
        />
      </ModalFooter>
    </Modal>
  );
};

export default CreateModal;
