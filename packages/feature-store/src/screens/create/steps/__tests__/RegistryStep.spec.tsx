import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegistryStep from '../RegistryStep';
import {
  FeatureStoreFormData,
  ProjectDirType,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
  RemoteRegistryType,
} from '../../types';
import { FeatureStoreKind } from '../../../../k8sTypes';

jest.mock('@odh-dashboard/internal/components/pf-overrides/FormSection', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <fieldset data-testid={`form-section-${title ?? 'unnamed'}`}>{children}</fieldset>
  ),
}));

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    dataTestId,
    options,
  }: {
    value: string;
    onChange: (key: string) => void;
    dataTestId?: string;
    options?: { key: string; label: string }[];
  }) => (
    <select data-testid={dataTestId} value={value} onChange={(e) => onChange(e.target.value)}>
      {options?.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('@odh-dashboard/ui-core/components/NumberInputWrapper', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    'data-testid': testId,
  }: {
    value: number;
    onChange: (v: number) => void;
    'data-testid'?: string;
  }) => (
    <input
      type="number"
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

jest.mock('../PvcConfigSection', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (v: unknown) => void }) => (
    <div data-testid="pvc-config-section">
      <button
        data-testid="pvc-config-trigger"
        onClick={() => onChange({ create: { resources: { requests: { storage: '10Gi' } } } })}
      />
    </div>
  ),
}));

jest.mock('../ServerConfigSection', () => ({
  __esModule: true,
  default: ({ title, onChange }: { title: string; onChange: (v: unknown) => void }) => (
    <div data-testid={`server-config-${title}`}>
      <button
        data-testid="server-config-trigger"
        onClick={() => onChange({ restAPI: true, grpc: false, metrics: true })}
      />
    </div>
  ),
}));

const makeFormData = (overrides: Partial<FeatureStoreFormData> = {}): FeatureStoreFormData => ({
  feastProject: 'test',
  namespace: 'test-ns',
  projectDirType: ProjectDirType.NONE,
  feastProjectDir: undefined,
  gitSecretName: '',
  registryType: RegistryType.LOCAL,
  remoteRegistryType: RemoteRegistryType.FEAST_REF,
  registryPersistenceType: PersistenceType.FILE,
  registrySecretName: '',
  onlinePersistenceType: PersistenceType.FILE,
  onlineStoreSecretName: '',
  offlineStoreEnabled: false,
  offlinePersistenceType: PersistenceType.FILE,
  offlineStoreSecretName: '',
  authzType: AuthzType.NONE,
  authz: undefined,
  scalingEnabled: false,
  scalingMode: ScalingMode.STATIC,
  replicas: 1,
  hpaMinReplicas: 1,
  hpaMaxReplicas: 3,
  batchEngineEnabled: false,
  batchEngineConfigMapName: '',
  batchEngineConfigMapKey: '',
  cronJob: {},
  services: {
    registry: {
      local: { server: { restAPI: true, grpc: true } },
    },
  },
  ...overrides,
});

const primaryStore: FeatureStoreKind = {
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: { name: 'primary-fs', namespace: 'primary-ns' },
  spec: { feastProject: 'primary' },
  status: { serviceHostnames: { registry: 'registry.primary-ns.svc:80' } },
};

describe('RegistryStep', () => {
  let setData: jest.Mock;

  beforeEach(() => {
    setData = jest.fn();
  });

  const renderStep = (
    overrides: Partial<FeatureStoreFormData> = {},
    props: {
      hasUILabeledStore?: boolean;
      primaryStore?: FeatureStoreKind;
      namespaceSecrets?: string[];
      namespaceConfigMaps?: string[];
    } = {},
  ) =>
    render(
      <RegistryStep
        data={makeFormData(overrides)}
        setData={setData}
        hasUILabeledStore={props.hasUILabeledStore ?? false}
        primaryStore={props.primaryStore}
        namespaceSecrets={props.namespaceSecrets ?? []}
        namespaceConfigMaps={props.namespaceConfigMaps ?? []}
      />,
    );

  it('renders local registry defaults: type radios, toggles, persistence options, and server config', () => {
    renderStep();
    expect(screen.getByLabelText('Local registry')).toBeChecked();
    expect(screen.getByLabelText('Remote registry')).not.toBeChecked();
    expect(screen.getByTestId('feast-registry-rest-api')).toBeInTheDocument();
    expect(screen.getByTestId('feast-registry-grpc')).toBeInTheDocument();
    expect(screen.getByLabelText('File-based')).toBeInTheDocument();
    expect(screen.getByLabelText('Database store')).toBeInTheDocument();
    expect(
      screen.getByTestId('server-config-Advanced registry server configuration'),
    ).toBeInTheDocument();
  });

  it('disables local registry and shows alert when a UI-labeled store exists', () => {
    renderStep(
      {
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.FEAST_REF,
        services: {
          registry: {
            remote: { feastRef: { name: 'primary-fs', namespace: 'primary-ns' } },
          },
        },
      },
      { hasUILabeledStore: true, primaryStore },
    );
    expect(screen.getByLabelText('Local registry')).toBeDisabled();
    expect(screen.getByText('Shared registry required')).toBeInTheDocument();
  });

  it('switches to remote registry type and preserves existing remote config', () => {
    renderStep({
      registryType: RegistryType.LOCAL,
      remoteRegistryType: RemoteRegistryType.HOSTNAME,
      services: {
        registry: {
          local: { server: { restAPI: true, grpc: true } },
          remote: { hostname: 'registry.example.com:443' },
        },
      },
    });
    fireEvent.click(screen.getByLabelText('Remote registry'));
    expect(setData).toHaveBeenCalledWith('registryType', RegistryType.REMOTE);
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({ server: { restAPI: true, grpc: true } }),
          remote: expect.objectContaining({ hostname: 'registry.example.com:443' }),
        }),
      }),
    );
  });

  it.each([
    ['REST API', 'feast-registry-rest-api', { restAPI: false, grpc: true }],
    ['gRPC', 'feast-registry-grpc', { restAPI: true, grpc: false }],
  ])('calls setData when %s toggle changes', (_, testId, expectedServer) => {
    renderStep();
    fireEvent.click(screen.getByTestId(testId));
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            server: expect.objectContaining(expectedServer),
          }),
        }),
      }),
    );
  });

  it('shows file persistence fields and warning for non-object-store path', () => {
    renderStep({
      registryPersistenceType: PersistenceType.FILE,
      services: {
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
            persistence: { file: { path: 'registry.db' } },
          },
        },
      },
    });
    expect(screen.getByText('Development only')).toBeInTheDocument();
    expect(screen.getByDisplayValue('registry.db')).toBeInTheDocument();
    expect(screen.getByTestId('feast-registry-cache-mode')).toBeInTheDocument();
  });

  it('updates file path and clears secret when switching away from S3', () => {
    renderStep(
      {
        registryPersistenceType: PersistenceType.FILE,
        registrySecretName: 'my-aws-secret',
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: {
                file: {
                  path: 's3://bucket/registry.db',
                  // eslint-disable-next-line camelcase
                  s3_additional_kwargs: { ServerSideEncryption: 'AES256' },
                },
              },
            },
          },
        },
      },
      { namespaceSecrets: ['my-aws-secret'] },
    );
    fireEvent.change(screen.getByDisplayValue('s3://bucket/registry.db'), {
      target: { value: '/local/registry.db' },
    });
    expect(setData).toHaveBeenCalledWith('registrySecretName', '');
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              file: expect.objectContaining({
                path: '/local/registry.db',
                // eslint-disable-next-line camelcase
                s3_additional_kwargs: undefined,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it.each([
    ['s3://', 's3://bucket/registry.db', /Secret containing AWS credentials/],
    ['gs://', 'gs://bucket/registry.db', /Secret containing GCS credentials/],
  ])('shows credentials secret and %s helper text for object-store path', (_, path, helperText) => {
    renderStep(
      {
        registryPersistenceType: PersistenceType.FILE,
        registrySecretName: '',
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: { file: { path } },
            },
          },
        },
      },
      { namespaceSecrets: ['cloud-secret'] },
    );
    expect(screen.getByTestId('feast-registry-credentials-secret')).toBeInTheDocument();
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  it.each([
    [
      'parses comma-separated values',
      undefined,
      'ServerSideEncryption=AES256, ACL=private',
      { ServerSideEncryption: 'AES256', ACL: 'private' },
    ],
    ['clears on empty input', { ServerSideEncryption: 'AES256' }, '', undefined],
  ] as [string, Record<string, string> | undefined, string, Record<string, string> | undefined][])(
    'S3 kwargs: %s',
    (_, existingKwargs, inputValue, expectedKwargs) => {
      renderStep(
        {
          registryPersistenceType: PersistenceType.FILE,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
                persistence: {
                  file: {
                    path: 's3://bucket/registry.db',
                    // eslint-disable-next-line camelcase
                    s3_additional_kwargs: existingKwargs,
                  },
                },
              },
            },
          },
        },
        { namespaceSecrets: ['aws-secret'] },
      );
      fireEvent.change(screen.getByPlaceholderText(/ServerSideEncryption/), {
        target: { value: inputValue },
      });
      expect(setData).toHaveBeenCalledWith(
        'services',
        expect.objectContaining({
          registry: expect.objectContaining({
            local: expect.objectContaining({
              persistence: expect.objectContaining({
                // eslint-disable-next-line camelcase
                file: expect.objectContaining({ s3_additional_kwargs: expectedKwargs }),
              }),
            }),
          }),
        }),
      );
    },
  );

  it('selects credentials secret for object-store path', () => {
    renderStep(
      {
        registryPersistenceType: PersistenceType.FILE,
        registrySecretName: '',
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: { file: { path: 's3://bucket/registry.db' } },
            },
          },
        },
      },
      { namespaceSecrets: ['aws-secret'] },
    );
    fireEvent.change(screen.getByTestId('feast-registry-credentials-secret'), {
      target: { value: 'aws-secret' },
    });
    expect(setData).toHaveBeenCalledWith('registrySecretName', 'aws-secret');
  });

  it('updates cache TTL and cache mode for file persistence', () => {
    renderStep({ registryPersistenceType: PersistenceType.FILE });

    fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '300' } });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              // eslint-disable-next-line camelcase
              file: expect.objectContaining({ cache_ttl_seconds: 300 }),
            }),
          }),
        }),
      }),
    );

    setData.mockClear();
    fireEvent.change(screen.getByTestId('feast-registry-cache-mode'), {
      target: { value: 'sync' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              // eslint-disable-next-line camelcase
              file: expect.objectContaining({ cache_mode: 'sync' }),
            }),
          }),
        }),
      }),
    );
  });

  it('clears s3_additional_kwargs when switching to DB persistence', () => {
    renderStep({
      registryPersistenceType: PersistenceType.FILE,
      services: {
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
            persistence: {
              file: {
                path: 's3://bucket/registry.db',
                // eslint-disable-next-line camelcase
                s3_additional_kwargs: { ServerSideEncryption: 'AES256' },
              },
            },
          },
        },
      },
    });
    fireEvent.click(screen.getByLabelText('Database store'));
    expect(setData).toHaveBeenCalledWith('registrySecretName', '');
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              // eslint-disable-next-line camelcase
              file: expect.objectContaining({ s3_additional_kwargs: undefined }),
            }),
          }),
        }),
      }),
    );
    expect(setData).toHaveBeenCalledWith('registryPersistenceType', PersistenceType.DB);
  });

  it('shows DB fields and updates type, secret, and secret key name', () => {
    renderStep(
      {
        registryPersistenceType: PersistenceType.DB,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: { store: { type: '', secretRef: { name: '' } } },
            },
          },
        },
      },
      { namespaceSecrets: ['db-secret'] },
    );
    expect(screen.getByTestId('feast-registry-db-type')).toBeInTheDocument();
    expect(screen.getByTestId('feast-registry-db-secret')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-registry-db-type'), {
      target: { value: 'sql' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              store: expect.objectContaining({ type: 'sql' }),
            }),
          }),
        }),
      }),
    );

    setData.mockClear();
    fireEvent.change(screen.getByTestId('feast-registry-db-secret'), {
      target: { value: 'db-secret' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              store: expect.objectContaining({ secretRef: { name: 'db-secret' } }),
            }),
          }),
        }),
      }),
    );

    setData.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Defaults to the database type'), {
      target: { value: 'custom-key' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            persistence: expect.objectContaining({
              store: expect.objectContaining({ secretKeyName: 'custom-key' }),
            }),
          }),
        }),
      }),
    );
  });

  it('renders DB fields when store has no secretRef', () => {
    renderStep({
      registryPersistenceType: PersistenceType.DB,
      services: {
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
            persistence: { store: { type: 'sql' } },
          },
        },
      },
    });
    expect(screen.getByTestId('feast-registry-db-secret')).toBeInTheDocument();
  });

  it.each([
    [
      'HOSTNAME',
      'External hostname',
      RemoteRegistryType.HOSTNAME,
      { hostname: 'registry.primary-ns.svc:80' },
    ],
    [
      'FEAST_REF',
      'FeatureStore reference',
      RemoteRegistryType.FEAST_REF,
      { feastRef: { name: 'primary-fs', namespace: 'primary-ns' } },
    ],
  ] as const)(
    'switches to remote %s and pre-fills from primary store',
    (_, radioLabel, expectedType, expectedRemote) => {
      const isHostname = expectedType === RemoteRegistryType.HOSTNAME;
      renderStep(
        {
          registryType: RegistryType.REMOTE,
          remoteRegistryType: isHostname
            ? RemoteRegistryType.FEAST_REF
            : RemoteRegistryType.HOSTNAME,
          services: {
            registry: {
              remote: isHostname
                ? { feastRef: { name: 'primary-fs', namespace: 'primary-ns' } }
                : { hostname: 'registry.primary-ns.svc:80' },
            },
          },
        },
        { hasUILabeledStore: true, primaryStore },
      );
      fireEvent.click(screen.getByLabelText(radioLabel));
      expect(setData).toHaveBeenCalledWith('remoteRegistryType', expectedType);
      expect(setData).toHaveBeenCalledWith(
        'services',
        expect.objectContaining({
          registry: expect.objectContaining({
            remote: expect.objectContaining(expectedRemote),
          }),
        }),
      );
    },
  );

  it('shows feastRef fields and updates name and namespace', () => {
    renderStep({
      registryType: RegistryType.REMOTE,
      remoteRegistryType: RemoteRegistryType.FEAST_REF,
      services: {
        registry: { remote: { feastRef: { name: '', namespace: '' } } },
      },
    });
    expect(screen.getByTestId('feast-ref-name')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-ref-name'), {
      target: { value: 'other-fs' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            feastRef: expect.objectContaining({ name: 'other-fs' }),
          }),
        }),
      }),
    );

    setData.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Uses the same project if left empty'), {
      target: { value: 'other-ns' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            feastRef: expect.objectContaining({ namespace: 'other-ns' }),
          }),
        }),
      }),
    );
  });

  it('feastRef name edit preserves hostname and TLS', () => {
    renderStep({
      registryType: RegistryType.REMOTE,
      remoteRegistryType: RemoteRegistryType.FEAST_REF,
      services: {
        registry: {
          remote: {
            hostname: 'registry.example.com:443',
            tls: { configMapRef: { name: 'ca-bundle' }, certName: 'ca.crt' },
            feastRef: { name: 'old-store', namespace: 'ns1' },
          },
        },
      },
    });
    fireEvent.change(screen.getByTestId('feast-ref-name'), {
      target: { value: 'new-store' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            hostname: 'registry.example.com:443',
            tls: expect.objectContaining({
              configMapRef: { name: 'ca-bundle' },
              certName: 'ca.crt',
            }),
            feastRef: expect.objectContaining({ name: 'new-store', namespace: 'ns1' }),
          }),
        }),
      }),
    );
  });

  it('shows hostname field and updates value', () => {
    renderStep({
      registryType: RegistryType.REMOTE,
      remoteRegistryType: RemoteRegistryType.HOSTNAME,
      services: {
        registry: { remote: { hostname: '' } },
      },
    });
    expect(screen.getByTestId('feast-remote-hostname')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-remote-hostname'), {
      target: { value: 'my-host:443' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({ hostname: 'my-host:443' }),
        }),
      }),
    );
  });

  it('toggles TLS on/off and updates configMap and certName', () => {
    renderStep(
      {
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: { hostname: 'registry.test-ns.svc:80' },
          },
        },
      },
      { namespaceConfigMaps: ['my-ca-cm'] },
    );

    fireEvent.click(screen.getByLabelText('TLS'));
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            tls: { configMapRef: { name: '' }, certName: 'service-ca.crt' },
          }),
        }),
      }),
    );
  });

  it('clears TLS when toggle is disabled', () => {
    renderStep(
      {
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: {
              hostname: 'host:443',
              tls: { configMapRef: { name: 'my-ca' }, certName: 'ca.crt' },
            },
          },
        },
      },
      { namespaceConfigMaps: ['my-ca'] },
    );

    fireEvent.click(screen.getByLabelText('TLS'));
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({ tls: undefined }),
        }),
      }),
    );
  });

  it('updates TLS configMap and certName', () => {
    renderStep(
      {
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: {
              hostname: 'host:443',
              tls: { configMapRef: { name: '' }, certName: 'ca.crt' },
            },
          },
        },
      },
      { namespaceConfigMaps: ['my-ca-cm'] },
    );

    fireEvent.change(screen.getByTestId('feast-remote-hostname-tls-configmap'), {
      target: { value: 'my-ca-cm' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            tls: expect.objectContaining({ configMapRef: { name: 'my-ca-cm' } }),
          }),
        }),
      }),
    );

    setData.mockClear();
    fireEvent.change(screen.getByPlaceholderText('service-ca.crt'), {
      target: { value: 'custom.pem' },
    });
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            tls: expect.objectContaining({ certName: 'custom.pem' }),
          }),
        }),
      }),
    );
  });

  it('ServerConfigSection onChange preserves sibling persistence keys', () => {
    renderStep({
      services: {
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
            persistence: { file: { path: '/data/registry.db' } },
          },
        },
      },
    });
    fireEvent.click(screen.getByTestId('server-config-trigger'));
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            server: { restAPI: true, grpc: false, metrics: true },
            persistence: { file: { path: '/data/registry.db' } },
          }),
        }),
      }),
    );
  });

  it('PvcConfigSection onChange preserves sibling file keys', () => {
    renderStep({
      registryPersistenceType: PersistenceType.FILE,
      services: {
        registry: {
          local: {
            server: { restAPI: true, grpc: true },
            persistence: { file: { path: 's3://bucket/registry.db' } },
          },
        },
      },
    });
    fireEvent.click(screen.getByTestId('pvc-config-trigger'));
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          local: expect.objectContaining({
            server: { restAPI: true, grpc: true },
            persistence: {
              file: expect.objectContaining({
                path: 's3://bucket/registry.db',
                pvc: { create: { resources: { requests: { storage: '10Gi' } } } },
              }),
            },
          }),
        }),
      }),
    );
  });
});
