import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Radio,
  Switch,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Alert,
  Stack,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/ui-core/components/NumberInputWrapper';
import PvcConfigSection from './PvcConfigSection';
import ServerConfigSection from './ServerConfigSection';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  RemoteRegistryType,
  VALID_REGISTRY_DB_TYPES,
} from '../types';
import {
  FeatureStoreKind,
  FeastLocalRegistryConfig,
  FeastRegistryFilePersistence,
  FeastRemoteRegistryConfig,
} from '../../../k8sTypes';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

const selectToggleStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
};

type RegistryStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  hasUILabeledStore: boolean;
  primaryStore: FeatureStoreKind | undefined;
  namespaceSecrets: string[];
  namespaceConfigMaps: string[];
};

const RegistryStep: React.FC<RegistryStepProps> = ({
  data,
  setData,
  hasUILabeledStore,
  primaryStore,
  namespaceSecrets,
  namespaceConfigMaps,
}) => {
  const registryDbOptions = VALID_REGISTRY_DB_TYPES.map((t) => ({
    key: t,
    label: t,
  }));

  const secretOptions = namespaceSecrets.map((s) => ({ key: s, label: s }));
  const configMapOptions = namespaceConfigMaps.map((cm) => ({ key: cm, label: cm }));

  const hostnameHasTls = !!data.services?.registry?.remote?.tls;
  const lockedToPrimary = hasUILabeledStore && !!primaryStore;

  const primaryName = primaryStore?.metadata.name;
  const primaryNamespace = primaryStore?.metadata.namespace;
  const primaryRegistryHost = primaryStore?.status?.serviceHostnames?.registry;

  React.useEffect(() => {
    if (!lockedToPrimary) {
      return;
    }
    const remote =
      data.remoteRegistryType === RemoteRegistryType.FEAST_REF
        ? { feastRef: { name: primaryName ?? '', namespace: primaryNamespace ?? '' } }
        : { hostname: primaryRegistryHost ?? '' };

    setData('services', {
      ...data.services,
      registry: { ...data.services?.registry, remote },
    });
  }, [lockedToPrimary, primaryName, primaryNamespace, primaryRegistryHost]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRemote = (updates: Partial<FeastRemoteRegistryConfig>) => {
    setData('services', {
      ...data.services,
      registry: {
        ...data.services?.registry,
        remote: {
          ...data.services?.registry?.remote,
          ...updates,
        },
      },
    });
  };

  const local = data.services?.registry?.local;
  const file = local?.persistence?.file;

  const updateLocalRegistry = (patch: FeastLocalRegistryConfig | undefined) => {
    setData('services', {
      ...data.services,
      registry: { ...data.services?.registry, local: patch },
    });
  };

  const updateRegistryFile = (fileUpdates: Partial<FeastRegistryFilePersistence>) => {
    updateLocalRegistry({
      ...local,
      persistence: { ...local?.persistence, file: { ...file, ...fileUpdates } },
    });
  };

  const registryFilePath = file?.path ?? '';
  const registryPathIsS3 = registryFilePath.startsWith('s3://');
  const registryPathIsGCS = registryFilePath.startsWith('gs://');
  const registryPathIsObjectStore = registryPathIsS3 || registryPathIsGCS;

  const updateRegistryType = (type: RegistryType) => {
    setData('registryType', type);
    if (type === RegistryType.LOCAL) {
      updateLocalRegistry({
        ...local,
        server: local?.server ?? { restAPI: true, grpc: true },
      });
    } else {
      const existing = data.services?.registry?.remote;
      setData('services', {
        ...data.services,
        registry: {
          ...data.services?.registry,
          remote: {
            ...existing,
            ...(data.remoteRegistryType === RemoteRegistryType.HOSTNAME
              ? { hostname: existing?.hostname ?? '' }
              : { feastRef: existing?.feastRef ?? { name: '' } }),
          },
        },
      });
    }
  };

  return (
    <Form maxWidth="750px">
      <FormSection title="Registry type">
        {hasUILabeledStore && primaryStore && (
          <Alert variant="info" isInline title="Shared registry required">
            A feature store with UI enabled already exists ({primaryStore.spec.feastProject} in
            project {primaryStore.metadata.namespace}). The remote registry is locked to point to
            that store.
          </Alert>
        )}
        <FormGroup fieldId="feast-registry-type">
          <Stack hasGutter>
            <Radio
              id="registry-local"
              data-testid="feast-registry-local"
              name="registry-type"
              label="Local registry"
              description={
                hasUILabeledStore
                  ? 'Not available — a shared registry already exists.'
                  : 'Deploy a registry server as part of this feature store.'
              }
              isChecked={data.registryType === RegistryType.LOCAL}
              onChange={() => updateRegistryType(RegistryType.LOCAL)}
              isDisabled={hasUILabeledStore}
            />
            <Radio
              id="registry-remote"
              data-testid="feast-registry-remote"
              name="registry-type"
              label="Remote registry"
              description="Use a registry from another feature store or external hostname."
              isChecked={data.registryType === RegistryType.REMOTE}
              onChange={() => updateRegistryType(RegistryType.REMOTE)}
            />
          </Stack>
        </FormGroup>
      </FormSection>

      {data.registryType === RegistryType.LOCAL && (
        <>
          <FormSection title="Registry server">
            <FormGroup fieldId="feast-registry-rest-api">
              <Switch
                id="feast-registry-rest-api"
                data-testid="feast-registry-rest-api"
                label="REST API"
                isChecked={local?.server?.restAPI ?? true}
                onChange={(_e, checked) =>
                  updateLocalRegistry({
                    ...local,
                    server: { ...local?.server, restAPI: checked },
                  })
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Must be enabled for the feature store UI to function.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup fieldId="feast-registry-grpc">
              <Switch
                id="feast-registry-grpc"
                data-testid="feast-registry-grpc"
                label="gRPC"
                isChecked={local?.server?.grpc ?? true}
                onChange={(_e, checked) =>
                  updateLocalRegistry({
                    ...local,
                    server: { ...local?.server, grpc: checked },
                  })
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Required for gRPC-based feature store clients and SDKs.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <ServerConfigSection
              title="Advanced registry server configuration"
              idPrefix="registry-server"
              serverConfig={local?.server}
              showRegistryTTL
              onChange={(config) => updateLocalRegistry({ ...local, server: config })}
            />
          </FormSection>

          <FormSection title="Registry persistence">
            <FormGroup fieldId="feast-registry-persistence-type">
              <Stack hasGutter>
                <Radio
                  id="registry-persistence-file"
                  name="registry-persistence-type"
                  label="File-based"
                  isChecked={data.registryPersistenceType === PersistenceType.FILE}
                  onChange={() => setData('registryPersistenceType', PersistenceType.FILE)}
                />
                <Radio
                  id="registry-persistence-db"
                  name="registry-persistence-type"
                  label="Database"
                  isChecked={data.registryPersistenceType === PersistenceType.DB}
                  onChange={() => {
                    setData('registrySecretName', '');
                    if (file?.s3_additional_kwargs) {
                      // eslint-disable-next-line camelcase
                      updateRegistryFile({ s3_additional_kwargs: undefined });
                    }
                    setData('registryPersistenceType', PersistenceType.DB);
                  }}
                />
              </Stack>
            </FormGroup>

            {data.registryPersistenceType === PersistenceType.FILE && (
              <>
                {!registryPathIsObjectStore && (
                  <Alert variant="warning" isInline isPlain title="Development only">
                    File-based persistence is not recommended for production. Use a database-backed
                    registry or S3/GCS object store for production deployments.
                  </Alert>
                )}
                <FormGroup label="Registry file path" fieldId="feast-registry-file-path">
                  <TextInput
                    id="feast-registry-file-path"
                    value={file?.path ?? ''}
                    onChange={(_e, val) => {
                      const wasObjectStore = registryPathIsObjectStore;
                      const isObjectStore = val.startsWith('s3://') || val.startsWith('gs://');
                      const wasS3 = registryPathIsS3;
                      const isS3 = val.startsWith('s3://');

                      const wasGCS = registryPathIsGCS;
                      const isGCS = val.startsWith('gs://');
                      if (
                        (wasObjectStore && !isObjectStore) ||
                        wasS3 !== isS3 ||
                        wasGCS !== isGCS
                      ) {
                        setData('registrySecretName', '');
                      }

                      updateRegistryFile({
                        path: val,
                        // eslint-disable-next-line camelcase
                        ...(wasS3 && !isS3 ? { s3_additional_kwargs: undefined } : {}),
                      });
                    }}
                    placeholder="registry.db or s3://bucket/registry.db"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Absolute path, S3 URI (s3://bucket/path), or GCS URI (gs://bucket/path).
                        Leave empty for operator default.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                {registryPathIsObjectStore && (
                  <>
                    <FormGroup
                      label="Credentials secret"
                      fieldId="feast-registry-credentials-secret"
                    >
                      <SimpleSelect
                        dataTestId="feast-registry-credentials-secret"
                        options={secretOptions}
                        value={data.registrySecretName}
                        placeholder="Select a secret"
                        onChange={(key) => setData('registrySecretName', key)}
                        isScrollable
                        isFullWidth
                        toggleProps={{ style: selectToggleStyle }}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            {registryPathIsS3
                              ? 'Secret containing AWS credentials (e.g. AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY). Injected as environment variables via envFrom.'
                              : 'Secret containing GCS credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS). Injected as environment variables via envFrom.'}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>

                    {registryPathIsS3 && (
                      <FormGroup label="S3 additional settings" fieldId="feast-registry-s3-kwargs">
                        <TextInput
                          id="feast-registry-s3-kwargs"
                          value={
                            file?.s3_additional_kwargs
                              ? Object.entries(file.s3_additional_kwargs)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join(', ')
                              : ''
                          }
                          onChange={(_e, val) => {
                            const kwargs: Record<string, string> = {};
                            if (val.trim()) {
                              for (const pair of val.split(',')) {
                                const eqIdx = pair.indexOf('=');
                                if (eqIdx > 0) {
                                  const key = pair.slice(0, eqIdx).trim();
                                  const value = pair.slice(eqIdx + 1).trim();
                                  if (key) {
                                    kwargs[key] = value;
                                  }
                                }
                              }
                            }
                            updateRegistryFile({
                              // eslint-disable-next-line camelcase
                              s3_additional_kwargs:
                                Object.keys(kwargs).length > 0 ? kwargs : undefined,
                            });
                          }}
                          placeholder="ServerSideEncryption=AES256, ACL=bucket-owner-full-control"
                        />
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem>
                              Comma-separated key=value pairs for S3 additional parameters (e.g.
                              ServerSideEncryption, ACL, CacheControl).
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      </FormGroup>
                    )}
                  </>
                )}

                <PvcConfigSection
                  idPrefix="registry"
                  pvcConfig={file?.pvc}
                  defaultMountPath="/data/registry"
                  defaultStorageSize="5Gi"
                  onChange={(pvc) => updateRegistryFile({ pvc: pvc ?? undefined })}
                />

                <FormGroup label="File cache TTL (seconds)" fieldId="feast-registry-cache-ttl">
                  <NumberInputWrapper
                    min={0}
                    value={file?.cache_ttl_seconds ?? 0}
                    onChange={(val) =>
                      // eslint-disable-next-line camelcase
                      updateRegistryFile({ cache_ttl_seconds: val || undefined })
                    }
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        How long (in seconds) the file-based registry cache remains valid before
                        re-reading from storage. 0 or empty for no caching.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                <FormGroup label="File cache update strategy" fieldId="feast-registry-cache-mode">
                  <SimpleSelect
                    dataTestId="feast-registry-cache-mode"
                    options={[
                      { key: 'none', label: 'none' },
                      { key: 'sync', label: 'sync' },
                      { key: 'thread', label: 'thread' },
                    ]}
                    value={file?.cache_mode ?? ''}
                    placeholder="Default (none)"
                    onChange={(key) =>
                      // eslint-disable-next-line camelcase
                      updateRegistryFile({ cache_mode: key || undefined })
                    }
                    isScrollable
                    isFullWidth
                    toggleProps={{ style: selectToggleStyle }}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        &quot;sync&quot; refreshes the cache synchronously on read.
                        &quot;thread&quot; uses a background thread for updates.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}

            {data.registryPersistenceType === PersistenceType.DB && (
              <>
                <FormGroup label="Database type" isRequired fieldId="feast-registry-db-type">
                  <SimpleSelect
                    dataTestId="feast-registry-db-type"
                    options={registryDbOptions}
                    value={local?.persistence?.store?.type ?? ''}
                    placeholder="Select database type"
                    onChange={(key) =>
                      updateLocalRegistry({
                        ...local,
                        persistence: {
                          ...local?.persistence,
                          store: {
                            ...local?.persistence?.store,
                            type: key,
                            secretRef: local?.persistence?.store?.secretRef ?? { name: '' },
                          },
                        },
                      })
                    }
                    isScrollable
                    isFullWidth
                    toggleProps={{ style: selectToggleStyle }}
                  />
                </FormGroup>
                <FormGroup label="Secret name" isRequired fieldId="feast-registry-db-secret">
                  <SimpleSelect
                    dataTestId="feast-registry-db-secret"
                    options={secretOptions}
                    value={local?.persistence?.store?.secretRef?.name ?? ''}
                    placeholder="Select a secret"
                    onChange={(key) =>
                      updateLocalRegistry({
                        ...local,
                        persistence: {
                          ...local?.persistence,
                          store: {
                            ...local?.persistence?.store,
                            type: local?.persistence?.store?.type ?? '',
                            secretRef: { name: key },
                          },
                        },
                      })
                    }
                    isScrollable
                    isFullWidth
                    toggleProps={{ style: selectToggleStyle }}
                  />
                </FormGroup>
                <FormGroup label="Secret key name" fieldId="feast-registry-db-secret-key">
                  <TextInput
                    id="feast-registry-db-secret-key"
                    value={local?.persistence?.store?.secretKeyName ?? ''}
                    onChange={(_e, val) =>
                      updateLocalRegistry({
                        ...local,
                        persistence: {
                          ...local?.persistence,
                          store: {
                            ...local?.persistence?.store,
                            type: local?.persistence?.store?.type ?? '',
                            secretRef: local?.persistence?.store?.secretRef ?? { name: '' },
                            secretKeyName: val || undefined,
                          },
                        },
                      })
                    }
                    placeholder="Defaults to the database type"
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Key within the secret that holds the connection config. Defaults to the
                        database type name if empty.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </>
            )}
          </FormSection>
        </>
      )}

      {data.registryType === RegistryType.REMOTE && (
        <FormSection title="Remote registry configuration">
          <FormGroup fieldId="feast-remote-registry-type">
            <Stack hasGutter>
              <Radio
                id="remote-feast-ref"
                name="remote-registry-type"
                label="Feature store reference"
                description="Reference another feature store in the cluster."
                isDisabled={lockedToPrimary}
                isChecked={data.remoteRegistryType === RemoteRegistryType.FEAST_REF}
                onChange={() => {
                  setData('remoteRegistryType', RemoteRegistryType.FEAST_REF);
                  setData('services', {
                    ...data.services,
                    registry: {
                      ...data.services?.registry,
                      remote: {
                        feastRef: data.services?.registry?.remote?.feastRef ?? {
                          name: primaryStore?.metadata.name ?? '',
                          namespace: primaryStore?.metadata.namespace ?? '',
                        },
                      },
                    },
                  });
                }}
              />
              <Radio
                id="remote-hostname"
                name="remote-registry-type"
                label="External hostname"
                description="Connect to a registry by hostname:port."
                isDisabled={lockedToPrimary}
                isChecked={data.remoteRegistryType === RemoteRegistryType.HOSTNAME}
                onChange={() => {
                  setData('remoteRegistryType', RemoteRegistryType.HOSTNAME);
                  const registryHost = primaryStore?.status?.serviceHostnames?.registry ?? '';
                  setData('services', {
                    ...data.services,
                    registry: {
                      ...data.services?.registry,
                      remote: {
                        hostname: data.services?.registry?.remote?.hostname ?? registryHost,
                      },
                    },
                  });
                }}
              />
            </Stack>
          </FormGroup>

          {data.remoteRegistryType === RemoteRegistryType.FEAST_REF && (
            <>
              <FormGroup label="Feature store name" isRequired fieldId="feast-ref-name">
                <TextInput
                  id="feast-ref-name"
                  data-testid="feast-ref-name"
                  isDisabled={lockedToPrimary}
                  value={data.services?.registry?.remote?.feastRef?.name ?? ''}
                  onChange={(_e, val) =>
                    updateRemote({
                      feastRef: {
                        ...data.services?.registry?.remote?.feastRef,
                        name: val,
                      },
                    })
                  }
                />
              </FormGroup>
              <FormGroup label="Feature store project" fieldId="feast-ref-namespace">
                <TextInput
                  id="feast-ref-namespace"
                  isDisabled={lockedToPrimary}
                  value={data.services?.registry?.remote?.feastRef?.namespace ?? ''}
                  onChange={(_e, val) =>
                    updateRemote({
                      feastRef: {
                        name: data.services?.registry?.remote?.feastRef?.name ?? '',
                        namespace: val,
                      },
                    })
                  }
                  placeholder="Uses the same project if left empty"
                />
              </FormGroup>
            </>
          )}

          {data.remoteRegistryType === RemoteRegistryType.HOSTNAME && (
            <>
              <FormGroup label="Hostname" isRequired fieldId="feast-remote-hostname">
                <TextInput
                  id="feast-remote-hostname"
                  data-testid="feast-remote-hostname"
                  isDisabled={lockedToPrimary}
                  value={data.services?.registry?.remote?.hostname ?? ''}
                  onChange={(_e, val) => updateRemote({ hostname: val })}
                  placeholder="registry.namespace.svc.cluster.local:80"
                />
              </FormGroup>
              <FormGroup fieldId="feast-remote-hostname-tls-toggle">
                <Switch
                  id="feast-remote-hostname-tls-toggle"
                  label="TLS"
                  isChecked={hostnameHasTls}
                  onChange={(_e, checked) => {
                    if (!checked) {
                      updateRemote({ tls: undefined });
                    } else {
                      updateRemote({
                        tls: { configMapRef: { name: '' }, certName: 'service-ca.crt' },
                      });
                    }
                  }}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Enable if the remote registry uses TLS. Provide the CA certificate ConfigMap
                      and key name.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              {hostnameHasTls && (
                <>
                  <FormGroup
                    label="TLS CA certificate ConfigMap"
                    isRequired
                    fieldId="feast-remote-hostname-tls-configmap"
                  >
                    <SimpleSelect
                      dataTestId="feast-remote-hostname-tls-configmap"
                      options={configMapOptions}
                      value={data.services?.registry?.remote?.tls?.configMapRef.name ?? ''}
                      placeholder="Select a ConfigMap"
                      onChange={(key) =>
                        updateRemote({
                          tls: {
                            configMapRef: { name: key },
                            certName: data.services?.registry?.remote?.tls?.certName ?? '',
                          },
                        })
                      }
                      isScrollable
                      isFullWidth
                      toggleProps={{ style: selectToggleStyle }}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          ConfigMap containing the CA certificate for verifying the registry&apos;s
                          TLS certificate.
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup
                    label="Certificate key name"
                    isRequired
                    fieldId="feast-remote-hostname-tls-certname"
                  >
                    <TextInput
                      id="feast-remote-hostname-tls-certname"
                      value={data.services?.registry?.remote?.tls?.certName ?? ''}
                      onChange={(_e, val) =>
                        updateRemote({
                          tls: {
                            configMapRef: {
                              name: data.services?.registry?.remote?.tls?.configMapRef.name ?? '',
                            },
                            certName: val,
                          },
                        })
                      }
                      placeholder="service-ca.crt"
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>
                          Key name in the ConfigMap that holds the CA certificate (e.g.
                          service-ca.crt, ca.crt).
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                </>
              )}
            </>
          )}
        </FormSection>
      )}
    </Form>
  );
};

export default RegistryStep;
