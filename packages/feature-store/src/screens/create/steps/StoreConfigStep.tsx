import React from 'react';
import {
  Form,
  FormGroup,
  FormSection,
  TextInput,
  Radio,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Alert,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import {
  FeatureStoreFormData,
  PersistenceType,
  VALID_OFFLINE_FILE_TYPES,
  VALID_OFFLINE_DB_TYPES,
  VALID_ONLINE_DB_TYPES,
} from '../types';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

type StoreConfigStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
};

const StoreConfigStep: React.FC<StoreConfigStepProps> = ({ data, setData, namespaceSecrets }) => {
  const onlineDbOptions = VALID_ONLINE_DB_TYPES.map((t) => ({ key: t, label: t }));
  const offlineFileTypeOptions = VALID_OFFLINE_FILE_TYPES.map((t) => ({ key: t, label: t }));
  const offlineDbOptions = VALID_OFFLINE_DB_TYPES.map((t) => ({ key: t, label: t }));
  const secretOptions = namespaceSecrets.map((s) => ({ key: s, label: s }));

  return (
    <Form>
      <FormSection title="Online store">
        <FormGroup fieldId="feast-online-store-enabled">
          <Switch
            id="feast-online-store-enabled"
            data-testid="feast-online-store-enabled"
            label="Enable online store"
            isChecked={data.onlineStoreEnabled}
            onChange={(_e, checked) => setData('onlineStoreEnabled', checked)}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                An ephemeral online store feature server is deployed by default.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        {data.onlineStoreEnabled && (
          <>
            <FormGroup label="Persistence type" fieldId="feast-online-persistence-type">
              <Radio
                id="online-persistence-file"
                name="online-persistence-type"
                label="File-based (ephemeral)"
                isChecked={data.onlinePersistenceType === PersistenceType.FILE}
                onChange={() => setData('onlinePersistenceType', PersistenceType.FILE)}
              />
              <Radio
                id="online-persistence-db"
                name="online-persistence-type"
                label="Database store"
                isChecked={data.onlinePersistenceType === PersistenceType.DB}
                onChange={() => setData('onlinePersistenceType', PersistenceType.DB)}
                className="pf-v6-u-mt-sm"
              />
            </FormGroup>

            {data.onlinePersistenceType === PersistenceType.FILE && (
              <>
                <Alert variant="warning" isInline isPlain title="Development only">
                  File-based persistence is not recommended for production. Use a database-backed
                  store for production deployments.
                </Alert>
                <FormGroup label="File path" fieldId="feast-online-file-path">
                  <TextInput
                    id="feast-online-file-path"
                    value={data.services?.onlineStore?.persistence?.file?.path ?? ''}
                    onChange={(_e, val) =>
                      setData('services', {
                        ...data.services,
                        onlineStore: {
                          ...data.services?.onlineStore,
                          persistence: { file: { path: val } },
                        },
                      })
                    }
                    placeholder="/feast-data/online_store.db"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Leave empty for operator default. Ephemeral stores must use absolute paths.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}

            {data.onlinePersistenceType === PersistenceType.DB && (
              <>
                <FormGroup label="Database type" isRequired fieldId="feast-online-db-type">
                  <SimpleSelect
                    dataTestId="feast-online-db-type"
                    options={onlineDbOptions}
                    value={data.services?.onlineStore?.persistence?.store?.type ?? ''}
                    placeholder="Select type"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        onlineStore: {
                          ...data.services?.onlineStore,
                          persistence: {
                            store: {
                              type: key,
                              secretRef: data.services?.onlineStore?.persistence?.store
                                ?.secretRef ?? {
                                name: '',
                              },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                </FormGroup>
                <FormGroup label="Secret name" isRequired fieldId="feast-online-db-secret">
                  <SimpleSelect
                    dataTestId="feast-online-db-secret"
                    options={secretOptions}
                    value={data.services?.onlineStore?.persistence?.store?.secretRef.name ?? ''}
                    placeholder="Select a secret"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        onlineStore: {
                          ...data.services?.onlineStore,
                          persistence: {
                            store: {
                              type: data.services?.onlineStore?.persistence?.store?.type ?? '',
                              secretRef: { name: key },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Secret with store connection parameters (placed as-is from
                        feature_store.yaml).
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                <FormGroup
                  label="Credentials secret (envFrom)"
                  fieldId="feast-online-credentials-secret"
                >
                  <SimpleSelect
                    dataTestId="feast-online-credentials-secret"
                    options={secretOptions}
                    value={data.onlineStoreSecretName}
                    placeholder="Select a secret (optional)"
                    onChange={(key) => setData('onlineStoreSecretName', key)}
                    isFullWidth
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Optional. Secret with cloud credentials (e.g. AWS, GCP) injected as
                        environment variables into the online store container.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}
          </>
        )}
      </FormSection>

      <FormSection title="Offline store">
        <FormGroup fieldId="feast-offline-store-enabled">
          <Switch
            id="feast-offline-store-enabled"
            data-testid="feast-offline-store-enabled"
            label="Enable offline store server"
            isChecked={data.offlineStoreEnabled}
            onChange={(_e, checked) => setData('offlineStoreEnabled', checked)}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Creates a remote offline server container. Disabled by default.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        {data.offlineStoreEnabled && (
          <>
            <FormGroup label="Persistence type" fieldId="feast-offline-persistence-type">
              <Radio
                id="offline-persistence-file"
                name="offline-persistence-type"
                label="File-based"
                isChecked={data.offlinePersistenceType === PersistenceType.FILE}
                onChange={() => setData('offlinePersistenceType', PersistenceType.FILE)}
              />
              <Radio
                id="offline-persistence-db"
                name="offline-persistence-type"
                label="Database store"
                isChecked={data.offlinePersistenceType === PersistenceType.DB}
                onChange={() => setData('offlinePersistenceType', PersistenceType.DB)}
                className="pf-v6-u-mt-sm"
              />
            </FormGroup>

            {data.offlinePersistenceType === PersistenceType.FILE && (
              <>
                <Alert variant="warning" isInline isPlain title="Development only">
                  File-based persistence is not recommended for production. Use a database-backed
                  store for production deployments.
                </Alert>
                <FormGroup label="File type" fieldId="feast-offline-file-type">
                  <SimpleSelect
                    dataTestId="feast-offline-file-type"
                    options={offlineFileTypeOptions}
                    value={data.services?.offlineStore?.persistence?.file?.type ?? ''}
                    placeholder="dask (default)"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        offlineStore: {
                          ...data.services?.offlineStore,
                          persistence: {
                            file: {
                              ...data.services?.offlineStore?.persistence?.file,
                              type: key,
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                </FormGroup>
              </>
            )}

            {data.offlinePersistenceType === PersistenceType.DB && (
              <>
                <FormGroup label="Database type" isRequired fieldId="feast-offline-db-type">
                  <SimpleSelect
                    dataTestId="feast-offline-db-type"
                    options={offlineDbOptions}
                    value={data.services?.offlineStore?.persistence?.store?.type ?? ''}
                    placeholder="Select type"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        offlineStore: {
                          ...data.services?.offlineStore,
                          persistence: {
                            store: {
                              type: key,
                              secretRef: data.services?.offlineStore?.persistence?.store
                                ?.secretRef ?? {
                                name: '',
                              },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                </FormGroup>
                <FormGroup label="Secret name" isRequired fieldId="feast-offline-db-secret">
                  <SimpleSelect
                    dataTestId="feast-offline-db-secret"
                    options={secretOptions}
                    value={data.services?.offlineStore?.persistence?.store?.secretRef.name ?? ''}
                    placeholder="Select a secret"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        offlineStore: {
                          ...data.services?.offlineStore,
                          persistence: {
                            store: {
                              type: data.services?.offlineStore?.persistence?.store?.type ?? '',
                              secretRef: { name: key },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Secret with store connection parameters (placed as-is from
                        feature_store.yaml).
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                <FormGroup
                  label="Credentials secret (envFrom)"
                  fieldId="feast-offline-credentials-secret"
                >
                  <SimpleSelect
                    dataTestId="feast-offline-credentials-secret"
                    options={secretOptions}
                    value={data.offlineStoreSecretName}
                    placeholder="Select a secret (optional)"
                    onChange={(key) => setData('offlineStoreSecretName', key)}
                    isFullWidth
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Optional. Secret with cloud credentials (e.g. AWS, GCP) injected as
                        environment variables into the offline store container.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}
          </>
        )}
      </FormSection>
    </Form>
  );
};

export default StoreConfigStep;
