import React from 'react';
import { Form, FormGroup, Radio, Switch, TextInput } from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import ServerConfigSection from './ServerConfigSection';
import PvcConfigSection from './PvcConfigSection';
import {
  FeatureStoreFormData,
  PersistenceType,
  VALID_ONLINE_DB_TYPES,
  VALID_OFFLINE_DB_TYPES,
  VALID_OFFLINE_FILE_TYPES,
} from '../types';
import { FeastOnlineStore, FeastOfflineStore } from '../../../k8sTypes';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

const selectToggleStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
};

type StoreConfigStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
};

const updateOnlineStore = (
  data: FeatureStoreFormData,
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>,
  patch: Partial<FeastOnlineStore>,
) => {
  setData('services', {
    ...data.services,
    onlineStore: {
      ...data.services?.onlineStore,
      ...patch,
    },
  });
};

const updateOfflineStore = (
  data: FeatureStoreFormData,
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>,
  patch: Partial<FeastOfflineStore>,
) => {
  setData('services', {
    ...data.services,
    offlineStore: {
      ...data.services?.offlineStore,
      ...patch,
    },
  });
};

type DBFieldsProps = {
  idPrefix: string;
  dbTypes: string[];
  storeType: string;
  secretName: string;
  secretKeyName: string;
  namespaceSecrets: string[];
  onTypeChange: (type: string) => void;
  onSecretChange: (name: string) => void;
  onKeyChange: (key: string) => void;
};

const DBFields: React.FC<DBFieldsProps> = ({
  idPrefix,
  dbTypes,
  storeType,
  secretName,
  secretKeyName,
  namespaceSecrets,
  onTypeChange,
  onSecretChange,
  onKeyChange,
}) => (
  <>
    <FormGroup label="Database type" fieldId={`${idPrefix}-db-type`} isRequired>
      <SimpleSelect
        dataTestId={`${idPrefix}-db-type`}
        isScrollable
        isFullWidth
        options={dbTypes.map((t) => ({ key: t, label: t }))}
        value={storeType}
        onChange={(val) => onTypeChange(val)}
        placeholder="Select database type"
        toggleProps={{ style: selectToggleStyle }}
      />
    </FormGroup>
    <FormGroup label="Database secret" fieldId={`${idPrefix}-db-secret`} isRequired>
      <SimpleSelect
        dataTestId={`${idPrefix}-db-secret`}
        isScrollable
        isFullWidth
        options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
        value={secretName}
        onChange={(val) => onSecretChange(val)}
        placeholder="Select a secret"
        toggleProps={{ style: selectToggleStyle }}
      />
    </FormGroup>
    <FormGroup label="Secret key name" fieldId={`${idPrefix}-db-secret-key`}>
      <TextInput
        id={`${idPrefix}-db-secret-key`}
        value={secretKeyName}
        onChange={(_e, val) => onKeyChange(val)}
        placeholder="Defaults to the database type"
      />
    </FormGroup>
  </>
);

const OnlineStoreSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
}> = ({ data, setData, namespaceSecrets }) => {
  const idPrefix = 'online-store';
  const onlineStore = data.services?.onlineStore;

  return (
    <>
      <FormGroup label="Persistence type" fieldId={`${idPrefix}-persistence-type`}>
        <Radio
          id={`${idPrefix}-persistence-file`}
          name={`${idPrefix}-persistence-type`}
          label="File"
          isChecked={data.onlinePersistenceType === PersistenceType.FILE}
          onChange={() => setData('onlinePersistenceType', PersistenceType.FILE)}
        />
        <Radio
          id={`${idPrefix}-persistence-db`}
          name={`${idPrefix}-persistence-type`}
          label="Database"
          isChecked={data.onlinePersistenceType === PersistenceType.DB}
          onChange={() => {
            setData('onlinePersistenceType', PersistenceType.DB);
            setData('onlineStoreSecretName', '');
          }}
        />
      </FormGroup>

      {data.onlinePersistenceType === PersistenceType.FILE && (
        <>
          <FormGroup label="File path" fieldId={`${idPrefix}-file-path`}>
            <TextInput
              id={`${idPrefix}-file-path`}
              value={onlineStore?.persistence?.file?.path ?? ''}
              onChange={(_e, val) =>
                updateOnlineStore(data, setData, {
                  persistence: {
                    ...onlineStore?.persistence,
                    file: { ...onlineStore?.persistence?.file, path: val || undefined },
                  },
                })
              }
              placeholder="/data/online_store.db"
            />
          </FormGroup>
          <FormGroup label="Credentials secret" fieldId={`${idPrefix}-cred-secret`}>
            <SimpleSelect
              dataTestId={`${idPrefix}-cred-secret`}
              isScrollable
              isFullWidth
              options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
              value={data.onlineStoreSecretName}
              onChange={(val) => setData('onlineStoreSecretName', val)}
              placeholder="Select a secret (optional)"
              toggleProps={{ style: selectToggleStyle }}
            />
          </FormGroup>
          <PvcConfigSection
            idPrefix={idPrefix}
            pvcConfig={onlineStore?.persistence?.file?.pvc}
            onChange={(pvc) =>
              updateOnlineStore(data, setData, {
                persistence: {
                  ...onlineStore?.persistence,
                  file: { ...onlineStore?.persistence?.file, pvc },
                },
              })
            }
            defaultMountPath="/data/online-store"
            defaultStorageSize="5Gi"
          />
        </>
      )}

      {data.onlinePersistenceType === PersistenceType.DB && (
        <DBFields
          idPrefix={idPrefix}
          dbTypes={VALID_ONLINE_DB_TYPES}
          storeType={onlineStore?.persistence?.store?.type ?? ''}
          secretName={onlineStore?.persistence?.store?.secretRef.name ?? ''}
          secretKeyName={onlineStore?.persistence?.store?.secretKeyName ?? ''}
          namespaceSecrets={namespaceSecrets}
          onTypeChange={(type) =>
            updateOnlineStore(data, setData, {
              persistence: {
                ...onlineStore?.persistence,
                store: {
                  ...onlineStore?.persistence?.store,
                  type,
                  secretRef: onlineStore?.persistence?.store?.secretRef ?? { name: '' },
                },
              },
            })
          }
          onSecretChange={(name) =>
            updateOnlineStore(data, setData, {
              persistence: {
                ...onlineStore?.persistence,
                store: {
                  ...onlineStore?.persistence?.store,
                  type: onlineStore?.persistence?.store?.type ?? '',
                  secretRef: { name },
                },
              },
            })
          }
          onKeyChange={(key) =>
            updateOnlineStore(data, setData, {
              persistence: {
                ...onlineStore?.persistence,
                store: {
                  ...onlineStore?.persistence?.store,
                  type: onlineStore?.persistence?.store?.type ?? '',
                  secretRef: onlineStore?.persistence?.store?.secretRef ?? { name: '' },
                  secretKeyName: key || undefined,
                },
              },
            })
          }
        />
      )}

      <ServerConfigSection
        title="Online store server configuration"
        idPrefix={`${idPrefix}-server`}
        serverConfig={onlineStore?.server}
        onChange={(server) => updateOnlineStore(data, setData, { server })}
      />
    </>
  );
};

const OfflineStoreSection: React.FC<{
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  namespaceSecrets: string[];
}> = ({ data, setData, namespaceSecrets }) => {
  const idPrefix = 'offline-store';
  const offlineStore = data.services?.offlineStore;

  return (
    <>
      <FormGroup label="Persistence type" fieldId={`${idPrefix}-persistence-type`}>
        <Radio
          id={`${idPrefix}-persistence-file`}
          name={`${idPrefix}-persistence-type`}
          label="File"
          isChecked={data.offlinePersistenceType === PersistenceType.FILE}
          onChange={() => setData('offlinePersistenceType', PersistenceType.FILE)}
        />
        <Radio
          id={`${idPrefix}-persistence-db`}
          name={`${idPrefix}-persistence-type`}
          label="Database"
          isChecked={data.offlinePersistenceType === PersistenceType.DB}
          onChange={() => {
            setData('offlinePersistenceType', PersistenceType.DB);
            setData('offlineStoreSecretName', '');
          }}
        />
      </FormGroup>

      {data.offlinePersistenceType === PersistenceType.FILE && (
        <>
          {VALID_OFFLINE_FILE_TYPES.length > 0 && (
            <FormGroup label="File type" fieldId={`${idPrefix}-file-type`}>
              <SimpleSelect
                dataTestId={`${idPrefix}-file-type`}
                isScrollable
                isFullWidth
                options={VALID_OFFLINE_FILE_TYPES.map((t) => ({ key: t, label: t }))}
                value={offlineStore?.persistence?.file?.type ?? ''}
                onChange={(val) =>
                  updateOfflineStore(data, setData, {
                    persistence: {
                      ...offlineStore?.persistence,
                      file: { ...offlineStore?.persistence?.file, type: val || undefined },
                    },
                  })
                }
                placeholder="Select file type"
                toggleProps={{ style: selectToggleStyle }}
              />
            </FormGroup>
          )}
          <FormGroup label="Credentials secret" fieldId={`${idPrefix}-cred-secret`}>
            <SimpleSelect
              dataTestId={`${idPrefix}-cred-secret`}
              isScrollable
              isFullWidth
              options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
              value={data.offlineStoreSecretName}
              onChange={(val) => setData('offlineStoreSecretName', val)}
              placeholder="Select a secret (optional)"
              toggleProps={{ style: selectToggleStyle }}
            />
          </FormGroup>
          <PvcConfigSection
            idPrefix={idPrefix}
            pvcConfig={offlineStore?.persistence?.file?.pvc}
            onChange={(pvc) =>
              updateOfflineStore(data, setData, {
                persistence: {
                  ...offlineStore?.persistence,
                  file: { ...offlineStore?.persistence?.file, pvc },
                },
              })
            }
            defaultMountPath="/data/offline-store"
            defaultStorageSize="5Gi"
          />
        </>
      )}

      {data.offlinePersistenceType === PersistenceType.DB && (
        <DBFields
          idPrefix={idPrefix}
          dbTypes={VALID_OFFLINE_DB_TYPES}
          storeType={offlineStore?.persistence?.store?.type ?? ''}
          secretName={offlineStore?.persistence?.store?.secretRef.name ?? ''}
          secretKeyName={offlineStore?.persistence?.store?.secretKeyName ?? ''}
          namespaceSecrets={namespaceSecrets}
          onTypeChange={(type) =>
            updateOfflineStore(data, setData, {
              persistence: {
                ...offlineStore?.persistence,
                store: {
                  ...offlineStore?.persistence?.store,
                  type,
                  secretRef: offlineStore?.persistence?.store?.secretRef ?? { name: '' },
                },
              },
            })
          }
          onSecretChange={(name) =>
            updateOfflineStore(data, setData, {
              persistence: {
                ...offlineStore?.persistence,
                store: {
                  ...offlineStore?.persistence?.store,
                  type: offlineStore?.persistence?.store?.type ?? '',
                  secretRef: { name },
                },
              },
            })
          }
          onKeyChange={(key) =>
            updateOfflineStore(data, setData, {
              persistence: {
                ...offlineStore?.persistence,
                store: {
                  ...offlineStore?.persistence?.store,
                  type: offlineStore?.persistence?.store?.type ?? '',
                  secretRef: offlineStore?.persistence?.store?.secretRef ?? { name: '' },
                  secretKeyName: key || undefined,
                },
              },
            })
          }
        />
      )}

      <ServerConfigSection
        title="Offline store server configuration"
        idPrefix={`${idPrefix}-server`}
        serverConfig={offlineStore?.server}
        onChange={(server) => updateOfflineStore(data, setData, { server })}
      />
    </>
  );
};

const StoreConfigStep: React.FC<StoreConfigStepProps> = ({ data, setData, namespaceSecrets }) => (
  <Form maxWidth="750px">
    <FormSection title="Online store" titleElement="h3">
      <OnlineStoreSection data={data} setData={setData} namespaceSecrets={namespaceSecrets} />
    </FormSection>

    <FormSection title="Offline store" titleElement="h3">
      <FormGroup fieldId="offline-store-toggle">
        <Switch
          id="offline-store-toggle"
          label="Enable offline store"
          isChecked={data.offlineStoreEnabled}
          onChange={(_e, checked) => setData('offlineStoreEnabled', checked)}
          data-testid="offline-store-toggle"
        />
      </FormGroup>

      {data.offlineStoreEnabled && (
        <OfflineStoreSection data={data} setData={setData} namespaceSecrets={namespaceSecrets} />
      )}
    </FormSection>
  </Form>
);

export default StoreConfigStep;
