import * as React from 'react';
import {
  Alert,
  Bullseye,
  Checkbox,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Radio,
  Spinner,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { ModelRegistryKind } from '#~/k8sTypes';
import { ModelRegistryModel } from '#~/api';
import {
  createModelRegistryBackend,
  updateModelRegistryBackend,
} from '#~/services/modelRegistrySettingsService';
import { isValidK8sName, kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import FormSection from '#~/components/pf-overrides/FormSection';
import { AreaContext } from '#~/concepts/areas/AreaContext';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import useModelRegistryCertificateNames from '#~/concepts/modelRegistrySettings/useModelRegistryCertificateNames';
import {
  constructRequestBody,
  findConfigMap,
  findSecureDBType,
  isClusterWideCABundleEnabled,
  isOpenshiftCAbundleEnabled,
} from '#~/pages/modelRegistrySettings/utils';
import { RecursivePartial } from '#~/typeHelpers';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import { CreateMRSecureDBSection, SecureDBInfo } from './CreateMRSecureDBSection';
import ModelRegistryDatabasePassword from './ModelRegistryDatabasePassword';
import {
  DatabaseSource,
  DatabaseType,
  DEFAULT_DATABASE_NAME,
  DEFAULT_MYSQL_PORT,
  DEFAULT_POSTGRES_PORT,
  ResourceType,
  SecureDBRType,
} from './const';

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
  const [databaseSource, setDatabaseSource] = React.useState<DatabaseSource>(
    DatabaseSource.DEFAULT,
  );
  const [databaseType, setDatabaseType] = React.useState<DatabaseType>(DatabaseType.MYSQL);
  const [host, setHost] = React.useState('');
  const [port, setPort] = React.useState(DEFAULT_MYSQL_PORT);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [database, setDatabase] = React.useState(DEFAULT_DATABASE_NAME);
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
      // Determine database type and source from existing registry
      const isPostgres = !!mr.spec.postgres;
      const isMysql = !!mr.spec.mysql;
      const dbSpec = mr.spec.mysql || mr.spec.postgres;

      if (isPostgres) {
        setDatabaseType(DatabaseType.POSTGRES);
        // Check if it's a default (generated) database
        if (mr.spec.postgres?.generateDeployment) {
          setDatabaseSource(DatabaseSource.DEFAULT);
        } else {
          setDatabaseSource(DatabaseSource.EXTERNAL);
        }
      } else if (isMysql) {
        setDatabaseType(DatabaseType.MYSQL);
        setDatabaseSource(DatabaseSource.EXTERNAL);
      }

      setHost(dbSpec?.host || '');
      setPort(
        dbSpec?.port?.toString() || (isPostgres ? DEFAULT_POSTGRES_PORT : DEFAULT_MYSQL_PORT),
      );
      setUsername(dbSpec?.username || '');
      setDatabase(dbSpec?.database || DEFAULT_DATABASE_NAME);

      const certificateResourceRef =
        mr.spec.mysql?.sslRootCertificateConfigMap ||
        mr.spec.mysql?.sslRootCertificateSecret ||
        mr.spec.postgres?.sslRootCertificateConfigMap ||
        mr.spec.postgres?.sslRootCertificateSecret;
      if (certificateResourceRef) {
        setAddSecureDB(true);
        const existingInfo = {
          type: findSecureDBType(certificateResourceRef.name, certificateResourceRef.key),
          nameSpace: '',
          key: certificateResourceRef.key,
          resourceName: certificateResourceRef.name,
          resourceType:
            mr.spec.mysql?.sslRootCertificateSecret || mr.spec.postgres?.sslRootCertificateSecret
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

    setDatabaseSource(DatabaseSource.DEFAULT);
    setDatabaseType(DatabaseType.MYSQL);
    setHost('');
    setPort(DEFAULT_MYSQL_PORT);
    setUsername('');
    setPassword('');
    setDatabase(DEFAULT_DATABASE_NAME);
    setIsHostTouched(false);
    setIsPortTouched(false);
    setIsUsernameTouched(false);
    setIsPasswordTouched(false);
    setIsDatabaseTouched(false);
    setShowPassword(false);
    setAddSecureDB(false);
    onClose();
  };

  /**
   * Updates the database type and sets the appropriate default port.
   * MySQL uses port 3306, PostgreSQL uses port 5432.
   * Only resets the port if it matches the old database type's default port.
   * This preserves user-modified port values when switching database types.
   * @param newType - The database type to switch to (MySQL or PostgreSQL)
   */
  const handleDatabaseTypeChange = (newType: string) => {
    // Validate that the value is a valid DatabaseType
    if (newType !== DatabaseType.MYSQL && newType !== DatabaseType.POSTGRES) {
      return;
    }

    // Get the default port for the current database type
    const currentDefaultPort =
      databaseType === DatabaseType.MYSQL ? DEFAULT_MYSQL_PORT : DEFAULT_POSTGRES_PORT;

    // Only update port if it matches the current default (hasn't been manually changed)
    if (port === currentDefaultPort) {
      setPort(newType === DatabaseType.MYSQL ? DEFAULT_MYSQL_PORT : DEFAULT_POSTGRES_PORT);
    }

    setDatabaseType(newType);
  };

  /**
   * Builds the database specification object based on the selected database source and type.
   * For Default source: Returns PostgreSQL config with generateDeployment=true
   * For External source: Returns MySQL or PostgreSQL config based on databaseType
   * @returns Database specification with either mysql or postgres configuration (and the other set to undefined)
   */
  const buildDatabaseSpec = (): Pick<ModelRegistryKind['spec'], 'mysql' | 'postgres'> => {
    if (databaseSource === DatabaseSource.DEFAULT) {
      // Default in-cluster PostgreSQL database
      return {
        postgres: {
          database: DEFAULT_DATABASE_NAME,
          generateDeployment: true,
          skipDBCreation: false,
        },
        mysql: undefined,
      };
    }

    // External database configuration
    const dbConfig = {
      host,
      port: Number(port),
      database,
      username,
      skipDBCreation: false,
    };

    if (databaseType === DatabaseType.POSTGRES) {
      return { postgres: dbConfig, mysql: undefined };
    }
    return { mysql: dbConfig, postgres: undefined };
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(undefined);

    const newDatabaseCACertificate =
      addSecureDB && secureDBInfo.type === SecureDBRType.NEW ? secureDBInfo.certificate : undefined;

    if (mr) {
      const dbSpec = buildDatabaseSpec();
      const data: RecursivePartial<ModelRegistryKind> = {
        metadata: {
          annotations: {
            'openshift.io/description': nameDesc.description,
            'openshift.io/display-name': nameDesc.name.trim(),
          },
        },
        spec: dbSpec.postgres
          ? {
              kubeRBACProxy: {},
              postgres: dbSpec.postgres,
            }
          : {
              kubeRBACProxy: {},
              mysql: dbSpec.mysql,
            },
      };

      try {
        await updateModelRegistryBackend(mr.metadata.name, {
          modelRegistry: constructRequestBody(data, secureDBInfo, addSecureDB, databaseType),
          databasePassword: databaseSource === DatabaseSource.EXTERNAL ? password : undefined,
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
      const dbSpec = buildDatabaseSpec();
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
        spec: dbSpec.postgres
          ? {
              kubeRBACProxy: {},
              grpc: {},
              rest: {},
              postgres: dbSpec.postgres,
            }
          : {
              kubeRBACProxy: {},
              grpc: {},
              rest: {},
              mysql: dbSpec.mysql,
            },
      };

      // Add SSL configuration for external databases
      if (databaseSource === DatabaseSource.EXTERNAL && addSecureDB) {
        const dbKey = databaseType === DatabaseType.POSTGRES ? 'postgres' : 'mysql';
        const dbConfig = data.spec[dbKey];
        if (dbConfig) {
          if (secureDBInfo.resourceType === ResourceType.Secret) {
            dbConfig.sslRootCertificateSecret = {
              name: secureDBInfo.resourceName,
              key: secureDBInfo.key,
            };
          } else {
            dbConfig.sslRootCertificateConfigMap = findConfigMap(secureDBInfo);
          }
        }
      }

      try {
        await createModelRegistryBackend({
          modelRegistry: data,
          databasePassword: databaseSource === DatabaseSource.EXTERNAL ? password : undefined,
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

  /**
   * Validates that the port is a numeric integer between 1 and 65535.
   * @param value - The port value to validate
   * @returns true if the port is valid, false otherwise
   */
  const isValidPort = (value: string): boolean => {
    const portNum = Number(value);
    return !Number.isNaN(portNum) && Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
  };

  const canSubmit = () => {
    const isValidName = isValidK8sName(
      nameDesc.k8sName.value || translateDisplayNameForK8s(nameDesc.name),
    );

    if (databaseSource === DatabaseSource.DEFAULT) {
      // For default database, only name is required
      return !isSubmitting && isValidName;
    }

    // For external database, all connection fields are required
    return (
      !isSubmitting &&
      isValidName &&
      hasContent(host) &&
      hasContent(password) &&
      hasContent(port) &&
      isValidPort(port) &&
      hasContent(username) &&
      hasContent(database) &&
      (!addSecureDB || (secureDBInfo.isValid && !configSecretsError))
    );
  };

  const databaseTypeOptions: SimpleSelectOption[] = [
    { key: DatabaseType.MYSQL, label: 'MySQL' },
    { key: DatabaseType.POSTGRES, label: 'PostgreSQL' },
  ];

  return (
    <Modal isOpen onClose={onCancelClose} variant="medium">
      <ModalHeader title={`${mr ? 'Edit' : 'Create'} model registry`} />
      <ModalBody>
        <Form>
          <K8sNameDescriptionField dataTestId="mr" data={nameDesc} onDataChange={setNameDesc} />
          <FormSection title="Database" description="Choose where to store model data.">
            <FormGroup role="radiogroup" fieldId="mr-database-source">
              <Radio
                isChecked={databaseSource === DatabaseSource.DEFAULT}
                name="database-source"
                onChange={() => setDatabaseSource(DatabaseSource.DEFAULT)}
                label="Default database (non-production)"
                description="PostgreSQL database enabled by default on the cluster."
                id="database-source-default"
                data-testid="mr-database-source-default"
              />
              <Radio
                isChecked={databaseSource === DatabaseSource.EXTERNAL}
                name="database-source"
                onChange={() => setDatabaseSource(DatabaseSource.EXTERNAL)}
                label="External database"
                description="Connect a MySQL or PostgreSQL database."
                id="database-source-external"
                data-testid="mr-database-source-external"
              />
            </FormGroup>

            {databaseSource === DatabaseSource.DEFAULT && (
              <Alert
                variant="info"
                isInline
                title="This default database is for development and testing purposes only. It is not supported by Red Hat for production use cases."
                data-testid="mr-default-database-alert"
              />
            )}
          </FormSection>

          {databaseSource === DatabaseSource.EXTERNAL && (
            <FormSection
              title={`Connect to external ${
                databaseType === DatabaseType.POSTGRES ? 'PostgreSQL' : 'MySQL'
              } database`}
              description="This external database is where model data is stored."
            >
              <FormGroup label="Database type" isRequired fieldId="mr-database-type">
                <SimpleSelect
                  dataTestId="mr-database-type"
                  toggleProps={{ id: 'mr-database-type-toggle' }}
                  isFullWidth
                  options={databaseTypeOptions}
                  value={databaseType}
                  onChange={(key) => handleDatabaseTypeChange(key)}
                />
              </FormGroup>
              <FormGroup label="Host" isRequired fieldId="mr-host">
                <TextInput
                  isRequired
                  type="text"
                  id="mr-host"
                  name="mr-host"
                  data-testid="mr-host-input"
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
                  data-testid="mr-port-input"
                  value={port}
                  onBlur={() => setIsPortTouched(true)}
                  onChange={(_e, value) => setPort(value)}
                  validated={
                    isPortTouched && (!hasContent(port) || !isValidPort(port)) ? 'error' : 'default'
                  }
                />
                {isPortTouched && !hasContent(port) && (
                  <HelperText>
                    <HelperTextItem variant="error" data-testid="mr-port-error">
                      Port cannot be empty
                    </HelperTextItem>
                  </HelperText>
                )}
                {isPortTouched && hasContent(port) && !isValidPort(port) && (
                  <HelperText>
                    <HelperTextItem variant="error" data-testid="mr-port-error">
                      Port must be a number between 1 and 65535
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
                  data-testid="mr-username-input"
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
            </FormSection>
          )}

          {databaseSource === DatabaseSource.EXTERNAL && (
            <FormSection
              title="Database settings"
              description="Configure database-specific settings."
            >
              <FormGroup label="Database" isRequired fieldId="mr-database">
                <TextInput
                  isRequired
                  type="text"
                  id="mr-database"
                  name="mr-database"
                  data-testid="mr-database-input"
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
            </FormSection>
          )}

          {databaseSource === DatabaseSource.EXTERNAL && secureDbEnabled && (
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
          )}

          {databaseSource === DatabaseSource.EXTERNAL &&
            secureDbEnabled &&
            addSecureDB &&
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
