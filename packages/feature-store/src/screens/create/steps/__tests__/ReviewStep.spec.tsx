import React from 'react';
import { render, screen } from '@testing-library/react';
import ReviewStep from '../ReviewStep';
import { DEFAULT_FEATURE_STORE_FORM_DATA } from '../../useCreateFeatureStoreProjectState';
import {
  FeatureStoreFormData,
  AuthzType,
  ScalingMode,
  PersistenceType,
  RegistryType,
  RemoteRegistryType,
  ProjectDirType,
} from '../../types';
import { StepValidation } from '../../validationUtils';

jest.mock('@odh-dashboard/internal/components/pf-overrides/FormSection', () => ({
  __esModule: true,
  default: ({
    children,
    title,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    title?: string;
    'data-testid'?: string;
  }) => (
    <fieldset data-testid={testId ?? `form-section-${title ?? 'unnamed'}`}>{children}</fieldset>
  ),
}));

jest.mock('../../utils', () => ({
  buildFormSpec: jest.fn(() => ({
    feastProject: 'test-project',
    namespace: 'test-ns',
  })),
  formSpecToYaml: jest.fn(() => 'apiVersion: feast.dev/v1\nkind: FeatureStore'),
}));

const validValidation: StepValidation = {
  projectBasics: { valid: true },
  registry: { valid: true },
  storeConfig: { valid: true },
  advanced: { valid: true },
};

const renderStep = (
  overrides: Partial<FeatureStoreFormData> = {},
  validationOverride?: Partial<StepValidation>,
  submitError?: Error,
) => {
  const data = {
    ...DEFAULT_FEATURE_STORE_FORM_DATA,
    feastProject: 'my-store',
    namespace: 'my-ns',
    ...overrides,
  };
  const validation = { ...validValidation, ...validationOverride };
  render(
    <ReviewStep
      data={data}
      validation={validation}
      submitError={submitError}
      hasUILabeledStore={false}
    />,
  );
  return { data };
};

describe('ReviewStep', () => {
  it('renders all summary sections and YAML preview', () => {
    renderStep();
    expect(screen.getByTestId('review-details')).toBeInTheDocument();
    expect(screen.getByTestId('review-registry')).toBeInTheDocument();
    expect(screen.getByTestId('review-stores')).toBeInTheDocument();
    expect(screen.getByTestId('review-advanced')).toBeInTheDocument();
    expect(screen.getByTestId('review-yaml')).toBeInTheDocument();
    expect(screen.getByTestId('review-yaml-content')).toBeInTheDocument();
  });

  it('shows feature store name and project', () => {
    renderStep();
    expect(screen.getByText('my-store')).toBeInTheDocument();
    expect(screen.getByText('my-ns')).toBeInTheDocument();
  });

  it.each([
    [true, 'present', new Error('Network error')],
    [false, 'absent', undefined],
  ])('submit error alert %s when error is %s', (shouldExist, _, error) => {
    renderStep({}, undefined, error);
    if (shouldExist) {
      expect(screen.getByTestId('review-submit-error')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('review-submit-error')).not.toBeInTheDocument();
    }
  });

  it.each([
    [true, { projectBasics: { valid: false, message: 'Name required' } }],
    [false, undefined],
  ])('validation warning shown=%s', (shouldExist, validationOverride) => {
    renderStep({}, validationOverride);
    if (shouldExist) {
      expect(screen.getByTestId('review-validation-warning')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('review-validation-warning')).not.toBeInTheDocument();
    }
  });

  it.each([
    [RegistryType.LOCAL, 'Local'],
    [RegistryType.REMOTE, 'Remote'],
  ])('shows registry type %s as "%s"', (type, expected) => {
    renderStep({ registryType: type });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [
      'NONE → Default (operator managed)',
      { projectDirType: ProjectDirType.NONE },
      'Default (operator managed)',
    ],
    [
      'GIT with URL',
      {
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: { git: { url: 'https://github.com/repo.git' } },
      },
      'Git: https://github.com/repo.git',
    ],
    [
      'GIT with empty URL',
      { projectDirType: ProjectDirType.GIT, feastProjectDir: { git: { url: '' } } },
      'Git: Not specified',
    ],
    [
      'INIT with template',
      {
        projectDirType: ProjectDirType.INIT,
        feastProjectDir: { init: { template: 'minimal' } },
      },
      'Init template: minimal',
    ],
    [
      'INIT with default template',
      { projectDirType: ProjectDirType.INIT, feastProjectDir: { init: {} } },
      'Init template: local',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string][])(
    'shows project directory: %s',
    (_, overrides, expected) => {
      renderStep(overrides);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it.each([
    [
      'DB persistence',
      {
        onlinePersistenceType: PersistenceType.DB,
        services: {
          onlineStore: {
            persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
          },
        },
      },
      'Database (redis)',
    ],
    [
      'file with path',
      {
        onlinePersistenceType: PersistenceType.FILE,
        services: { onlineStore: { persistence: { file: { path: '/custom/path.db' } } } },
      },
      'File (/custom/path.db)',
    ],
    [
      'file with type',
      {
        offlineStoreEnabled: true,
        offlinePersistenceType: PersistenceType.FILE,
        services: { offlineStore: { persistence: { file: { type: 'duckdb' } } } },
      },
      'File (duckdb)',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string][])(
    'shows store description: %s',
    (_, overrides, expected) => {
      renderStep(overrides);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it('shows offline store as disabled when not enabled', () => {
    renderStep({ offlineStoreEnabled: false });
    const storesSection = screen.getByTestId('review-stores');
    expect(storesSection).toHaveTextContent('Disabled');
  });

  it.each([
    ['Kubernetes RBAC', { authzType: AuthzType.KUBERNETES }, 'Kubernetes RBAC'],
    [
      'OIDC with secret',
      { authzType: AuthzType.OIDC, authz: { oidc: { secretRef: { name: 'my-oidc' } } } },
      'OIDC (my-oidc)',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string][])(
    'shows authorization: %s',
    (_, overrides, expected) => {
      renderStep(overrides);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it.each([
    [ScalingMode.STATIC, 3, 'Static (3 replicas)'],
    [ScalingMode.STATIC, 1, 'Static (1 replica)'],
    [ScalingMode.HPA, 1, 'HPA (2–8 replicas)'],
  ])('shows scaling mode %s with replicas=%d', (mode, replicas, expected) => {
    renderStep({
      scalingEnabled: true,
      scalingMode: mode,
      replicas,
      hpaMinReplicas: 2,
      hpaMaxReplicas: 8,
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('shows scaling and batch engine as Disabled when off', () => {
    renderStep({ scalingEnabled: false, batchEngineEnabled: false });
    const advanced = screen.getByTestId('review-advanced');
    expect(advanced).toHaveTextContent('Disabled');
  });

  it.each([
    ['cron job schedule', { cronJob: { schedule: '*/10 * * * *' } }, '*/10 * * * *'],
    [
      'batch engine configmap',
      { batchEngineEnabled: true, batchEngineConfigMapName: 'my-config' },
      'my-config',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string][])(
    'shows %s value',
    (_, overrides, expected) => {
      renderStep(overrides);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it.each([
    [
      'remote hostname',
      {
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: { registry: { remote: { hostname: 'registry.svc:8080' } } },
      },
      'Hostname: registry.svc:8080',
    ],
    [
      'feast ref with namespace',
      {
        registryType: RegistryType.REMOTE,
        services: {
          registry: { remote: { feastRef: { name: 'primary', namespace: 'prod-ns' } } },
        },
      },
      'Feature store reference: primary (prod-ns)',
    ],
    [
      'local DB',
      {
        registryType: RegistryType.LOCAL,
        registryPersistenceType: PersistenceType.DB,
        services: { registry: { local: { persistence: { store: { type: 'sql' } } } } },
      },
      'Local (database: sql)',
    ],
  ] as [string, Partial<FeatureStoreFormData>, string][])(
    'shows registry description: %s',
    (_, overrides, expected) => {
      renderStep(overrides);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );

  it('shows YAML error fallback and logs the error', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { formSpecToYaml } = jest.requireMock('../../utils');
    const parseError = new Error('parse error');
    formSpecToYaml.mockImplementation(() => {
      throw parseError;
    });
    renderStep();
    expect(screen.getByTestId('review-yaml-content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('# Error generating YAML preview')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to generate FeatureStore YAML preview',
      parseError,
    );
    formSpecToYaml.mockImplementation(() => 'apiVersion: feast.dev/v1\nkind: FeatureStore');
    consoleSpy.mockRestore();
  });
});
