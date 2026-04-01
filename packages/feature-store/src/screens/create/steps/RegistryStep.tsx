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
  Stack,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import PvcConfigSection from './PvcConfigSection';
import ServerConfigSection from './ServerConfigSection';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  RemoteRegistryType,
  VALID_REGISTRY_DB_TYPES,
} from '../types';
import { FeatureStoreKind, FeastRemoteRegistryConfig } from '../../../k8sTypes';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

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

  const [hostnameHasTls, setHostnameHasTls] = React.useState(
    () => !!data.services?.registry?.remote?.tls,
  );

  const updateHostnameRemote = (updates: Partial<FeastRemoteRegistryConfig>) => {
    setData('services', {
      ...data.services,
      registry: {
        remote: {
          ...data.services?.registry?.remote,
          ...updates,
        },
      },
    });
  };

  const registryFilePath = data.services?.registry?.local?.persistence?.file?.path ?? '';
  const registryPathIsS3 = registryFilePath.startsWith('s3://');
  const registryPathIsGCS = registryFilePath.startsWith('gs://');
  const registryPathIsObjectStore = registryPathIsS3 || registryPathIsGCS;

  const updateRegistryType = (type: RegistryType) => {
    setData('registryType', type);
    if (type === RegistryType.LOCAL) {
      setData('services', {
        ...data.services,
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
          },
        },
      });
    } else {
      setData('services', {
        ...data.services,
        registry: {
          remote:
            data.remoteRegistryType === RemoteRegistryType.HOSTNAME
              ? { hostname: '' }
              : { feastRef: { name: '' } },
        },
      });
    }
  };

  return (
    <Form>
      <FormSection title="Registry type">
        {hasUILabeledStore && primaryStore && (
          <Alert variant="info" isInline title="Shared registry required">
            A feature store with UI enabled already exists (&quot;
            {primaryStore.spec.feastProject}&quot; in namespace &quot;
            {primaryStore.metadata.namespace}&quot;). New feature stores must use a remote registry
            pointing to the existing registry to share feature data.
          </Alert>
        )}
        <FormGroup fieldId="feast-registry-type">
          <Stack hasGutter>
            <Radio
              id="registry-local"
              name="registry-type"
              label="Local registry"
              description={
                hasUILabeledStore
                  ? 'Not available — a shared registry already exists'
                  : 'Deploy a registry server as part of this FeatureStore'
              }
              isChecked={data.registryType === RegistryType.LOCAL}
              onChange={() => updateRegistryType(RegistryType.LOCAL)}
              isDisabled={hasUILabeledStore}
            />
            <Radio
              id="registry-remote"
              name="registry-type"
              label="Remote registry"
              description="Use a registry from another FeatureStore or external hostname"
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
                isChecked={data.services?.registry?.local?.server?.restAPI ?? true}
                onChange={(_e, checked) =>
                  setData('services', {
                    ...data.services,
                    registry: {
                      local: {
                        ...data.services?.registry?.local,
                        server: {
                          ...data.services?.registry?.local?.server,
                          restAPI: checked,
                        },
                      },
                    },
                  })
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    REST API must be enabled for the Feature Store UI to function. Recommended:
                    true.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup fieldId="feast-registry-grpc">
              <Switch
                id="feast-registry-grpc"
                data-testid="feast-registry-grpc"
                label="gRPC"
                isChecked={data.services?.registry?.local?.server?.grpc ?? true}
                onChange={(_e, checked) =>
                  setData('services', {
                    ...data.services,
                    registry: {
                      local: {
                        ...data.services?.registry?.local,
                        server: {
                          ...data.services?.registry?.local?.server,
                          grpc: checked,
                        },
                      },
                    },
                  })
                }
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Required for gRPC-based Feature Store clients and SDKs. Recommended: true.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <ServerConfigSection
              title="Advanced registry server configuration"
              serverConfig={data.services?.registry?.local?.server}
              showRegistryTTL
              onChange={(config) =>
                setData('services', {
                  ...data.services,
                  registry: {
                    ...data.services?.registry,
                    local: { ...data.services?.registry?.local, server: config },
                  },
                })
              }
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
                  label="Database store"
                  isChecked={data.registryPersistenceType === PersistenceType.DB}
                  onChange={() => {
                    setData('registrySecretName', '');
                    const file = data.services?.registry?.local?.persistence?.file;
                    // eslint-disable-next-line camelcase
                    if (file?.s3_additional_kwargs) {
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              file: {
                                ...file,
                                // eslint-disable-next-line camelcase
                                s3_additional_kwargs: undefined,
                              },
                            },
                          },
                        },
                      });
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
                    value={data.services?.registry?.local?.persistence?.file?.path ?? ''}
                    onChange={(_e, val) => {
                      const wasObjectStore = registryPathIsObjectStore;
                      const isObjectStore = val.startsWith('s3://') || val.startsWith('gs://');
                      const wasS3 = registryPathIsS3;
                      const isS3 = val.startsWith('s3://');

                      if (wasObjectStore && !isObjectStore) {
                        setData('registrySecretName', '');
                      }

                      const file = data.services?.registry?.local?.persistence?.file;
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              file: {
                                ...file,
                                path: val,
                                // eslint-disable-next-line camelcase
                                ...(wasS3 && !isS3 ? { s3_additional_kwargs: undefined } : {}),
                              },
                            },
                          },
                        },
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
                        isFullWidth
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
                            data.services?.registry?.local?.persistence?.file?.s3_additional_kwargs
                              ? Object.entries(
                                  data.services.registry.local.persistence.file
                                    .s3_additional_kwargs,
                                )
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
                            setData('services', {
                              ...data.services,
                              registry: {
                                local: {
                                  ...data.services?.registry?.local,
                                  persistence: {
                                    file: {
                                      ...data.services?.registry?.local?.persistence?.file,
                                      // eslint-disable-next-line camelcase
                                      s3_additional_kwargs:
                                        Object.keys(kwargs).length > 0 ? kwargs : undefined,
                                    },
                                  },
                                },
                              },
                            });
                          }}
                          placeholder="ServerSideEncryption=AES256, ACL=bucket-owner-full-control"
                        />
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem>
                              Comma-separated key=value pairs for S3 additional kwargs (e.g.
                              ServerSideEncryption, ACL, CacheControl).
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      </FormGroup>
                    )}
                  </>
                )}

                <PvcConfigSection
                  pvcConfig={data.services?.registry?.local?.persistence?.file?.pvc}
                  defaultMountPath="/data/registry"
                  defaultStorageSize="5Gi"
                  onChange={(pvc) =>
                    setData('services', {
                      ...data.services,
                      registry: {
                        local: {
                          ...data.services?.registry?.local,
                          persistence: {
                            file: {
                              ...data.services?.registry?.local?.persistence?.file,
                              pvc: pvc ?? undefined,
                            },
                          },
                        },
                      },
                    })
                  }
                />

                <FormGroup label="File cache TTL (seconds)" fieldId="feast-registry-cache-ttl">
                  <NumberInputWrapper
                    min={0}
                    value={
                      data.services?.registry?.local?.persistence?.file?.cache_ttl_seconds ?? 0
                    }
                    onChange={(val) =>
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              file: {
                                ...data.services?.registry?.local?.persistence?.file,
                                // eslint-disable-next-line camelcase
                                cache_ttl_seconds: val || undefined,
                              },
                            },
                          },
                        },
                      })
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
                    value={data.services?.registry?.local?.persistence?.file?.cache_mode ?? ''}
                    placeholder="Default (none)"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              file: {
                                ...data.services?.registry?.local?.persistence?.file,
                                // eslint-disable-next-line camelcase
                                cache_mode: key || undefined,
                              },
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
                    value={data.services?.registry?.local?.persistence?.store?.type ?? ''}
                    placeholder="Select type"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              store: {
                                ...data.services?.registry?.local?.persistence?.store,
                                type: key,
                                secretRef: data.services?.registry?.local?.persistence?.store
                                  ?.secretRef ?? {
                                  name: '',
                                },
                              },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                </FormGroup>
                <FormGroup label="Secret name" isRequired fieldId="feast-registry-db-secret">
                  <SimpleSelect
                    dataTestId="feast-registry-db-secret"
                    options={secretOptions}
                    value={data.services?.registry?.local?.persistence?.store?.secretRef.name ?? ''}
                    placeholder="Select a secret"
                    onChange={(key) =>
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              store: {
                                ...data.services?.registry?.local?.persistence?.store,
                                type:
                                  data.services?.registry?.local?.persistence?.store?.type ?? '',
                                secretRef: { name: key },
                              },
                            },
                          },
                        },
                      })
                    }
                    isFullWidth
                  />
                </FormGroup>
                <FormGroup label="Secret key name" fieldId="feast-registry-db-secret-key">
                  <TextInput
                    id="feast-registry-db-secret-key"
                    value={data.services?.registry?.local?.persistence?.store?.secretKeyName ?? ''}
                    onChange={(_e, val) =>
                      setData('services', {
                        ...data.services,
                        registry: {
                          local: {
                            ...data.services?.registry?.local,
                            persistence: {
                              store: {
                                ...data.services?.registry?.local?.persistence?.store,
                                type:
                                  data.services?.registry?.local?.persistence?.store?.type ?? '',
                                secretRef: data.services?.registry?.local?.persistence?.store
                                  ?.secretRef ?? { name: '' },
                                secretKeyName: val || undefined,
                              },
                            },
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
                label="FeatureStore reference"
                description="Reference another FeatureStore CR in the cluster"
                isChecked={data.remoteRegistryType === RemoteRegistryType.FEAST_REF}
                onChange={() => {
                  setData('remoteRegistryType', RemoteRegistryType.FEAST_REF);
                  setHostnameHasTls(false);
                  setData('services', {
                    ...data.services,
                    registry: {
                      remote: {
                        feastRef: {
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
                description="Connect to a registry by hostname:port"
                isChecked={data.remoteRegistryType === RemoteRegistryType.HOSTNAME}
                onChange={() => {
                  setData('remoteRegistryType', RemoteRegistryType.HOSTNAME);
                  const registryHost = primaryStore?.status?.serviceHostnames?.registry ?? '';
                  setData('services', {
                    ...data.services,
                    registry: { remote: { hostname: registryHost } },
                  });
                }}
              />
            </Stack>
          </FormGroup>

          {data.remoteRegistryType === RemoteRegistryType.FEAST_REF && (
            <>
              <FormGroup label="FeatureStore name" isRequired fieldId="feast-ref-name">
                <TextInput
                  id="feast-ref-name"
                  data-testid="feast-ref-name"
                  value={data.services?.registry?.remote?.feastRef?.name ?? ''}
                  onChange={(_e, val) =>
                    setData('services', {
                      ...data.services,
                      registry: {
                        remote: {
                          feastRef: {
                            ...data.services?.registry?.remote?.feastRef,
                            name: val,
                          },
                        },
                      },
                    })
                  }
                />
              </FormGroup>
              <FormGroup label="FeatureStore namespace" fieldId="feast-ref-namespace">
                <TextInput
                  id="feast-ref-namespace"
                  value={data.services?.registry?.remote?.feastRef?.namespace ?? ''}
                  onChange={(_e, val) =>
                    setData('services', {
                      ...data.services,
                      registry: {
                        remote: {
                          feastRef: {
                            name: data.services?.registry?.remote?.feastRef?.name ?? '',
                            namespace: val,
                          },
                        },
                      },
                    })
                  }
                  placeholder="Same namespace if empty"
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
                  value={data.services?.registry?.remote?.hostname ?? ''}
                  onChange={(_e, val) => updateHostnameRemote({ hostname: val })}
                  placeholder="registry.namespace.svc.cluster.local:80"
                />
              </FormGroup>
              <FormGroup fieldId="feast-remote-hostname-tls-toggle">
                <Switch
                  id="feast-remote-hostname-tls-toggle"
                  label="TLS"
                  isChecked={hostnameHasTls}
                  onChange={(_e, checked) => {
                    setHostnameHasTls(checked);
                    if (!checked) {
                      updateHostnameRemote({ tls: undefined });
                    } else {
                      updateHostnameRemote({
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
                        updateHostnameRemote({
                          tls: {
                            configMapRef: { name: key },
                            certName: data.services?.registry?.remote?.tls?.certName ?? '',
                          },
                        })
                      }
                      isFullWidth
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
                        updateHostnameRemote({
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
