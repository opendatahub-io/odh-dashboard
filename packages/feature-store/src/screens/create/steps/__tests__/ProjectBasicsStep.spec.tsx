import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectBasicsStep from '../ProjectBasicsStep';
import {
  FeatureStoreFormData,
  ProjectDirType,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
  RemoteRegistryType,
} from '../../types';

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

const mockAccessibleNamespaces = {
  namespaces: [
    { name: 'ns-a', displayName: 'Namespace A' },
    { name: 'ns-b', displayName: 'ns-b' },
  ],
  loaded: true,
};

const makeFormData = (overrides: Partial<FeatureStoreFormData> = {}): FeatureStoreFormData => ({
  feastProject: '',
  namespace: '',
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
  authzType: AuthzType.KUBERNETES,
  authz: { kubernetes: { roles: [] } },
  scalingEnabled: false,
  scalingMode: ScalingMode.STATIC,
  replicas: 1,
  hpaMinReplicas: 1,
  hpaMaxReplicas: 3,
  batchEngineEnabled: false,
  batchEngineConfigMapName: '',
  batchEngineConfigMapKey: '',
  cronJob: {},
  services: {},
  ...overrides,
});

describe('ProjectBasicsStep', () => {
  let setData: jest.Mock;

  beforeEach(() => {
    setData = jest.fn();
  });

  const renderStep = (
    overrides: Partial<FeatureStoreFormData> = {},
    props: { existingProjectNames?: string[]; namespaceSecrets?: string[] } = {},
  ) =>
    render(
      <ProjectBasicsStep
        data={makeFormData(overrides)}
        setData={setData}
        existingProjectNames={props.existingProjectNames ?? []}
        namespaceSecrets={props.namespaceSecrets ?? []}
        accessibleNamespaces={mockAccessibleNamespaces}
      />,
    );

  it('renders name and namespace fields, and updates name on change', () => {
    renderStep();
    expect(screen.getByTestId('feast-project-name')).toBeInTheDocument();
    expect(screen.getByTestId('feast-namespace-toggle')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-project-name'), {
      target: { value: 'my-store' },
    });
    expect(setData).toHaveBeenCalledWith('feastProject', 'my-store');
  });

  it.each([
    ['invalid name', { feastProject: 'INVALID_NAME' }, [], /must consist of lowercase/i],
    ['duplicate name', { feastProject: 'existing' }, ['existing'], /already exists/i],
  ])('shows validation error for %s', (_, overrides, existingProjectNames, errorPattern) => {
    renderStep(overrides, { existingProjectNames });
    expect(screen.getByText(errorPattern)).toBeInTheDocument();
  });

  it('shows alert when existing project names are present', () => {
    renderStep({}, { existingProjectNames: ['existing-project'] });
    expect(screen.getByText(/Existing feature store detected/i)).toBeInTheDocument();
  });

  it('clears namespace-scoped state and resets TLS configMapRef on namespace change', () => {
    renderStep({
      namespace: 'ns-a',
      services: {
        registry: {
          remote: {
            hostname: 'registry.ns-a.svc:80',
            tls: { configMapRef: { name: 'ns-a-ca' }, certName: 'ca.crt' },
          },
        },
      },
    });
    fireEvent.change(screen.getByTestId('feast-namespace-toggle'), {
      target: { value: 'ns-b' },
    });
    expect(setData).toHaveBeenCalledWith('registrySecretName', '');
    expect(setData).toHaveBeenCalledWith('onlineStoreSecretName', '');
    expect(setData).toHaveBeenCalledWith('offlineStoreSecretName', '');
    expect(setData).toHaveBeenCalledWith('gitSecretName', '');
    expect(setData).toHaveBeenCalledWith('batchEngineConfigMapName', '');
    expect(setData).toHaveBeenCalledWith('batchEngineConfigMapKey', '');
    expect(setData).toHaveBeenCalledWith('namespace', 'ns-b');
    expect(setData).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: expect.objectContaining({
          remote: expect.objectContaining({
            tls: { configMapRef: { name: '' }, certName: 'ca.crt' },
          }),
        }),
      }),
    );
  });

  it('does not call setData for services when TLS is absent on namespace change', () => {
    renderStep({ namespace: 'ns-a' });
    fireEvent.change(screen.getByTestId('feast-namespace-toggle'), {
      target: { value: 'ns-b' },
    });
    expect(setData).toHaveBeenCalledWith('namespace', 'ns-b');
    expect(setData).not.toHaveBeenCalledWith('services', expect.anything());
  });

  it.each([
    ['NONE', ProjectDirType.NONE, undefined],
    ['INIT', ProjectDirType.INIT, { init: {} }],
    ['GIT', ProjectDirType.GIT, { git: { url: '' } }],
  ] as [string, ProjectDirType, FeatureStoreFormData['feastProjectDir']][])(
    'handles project dir change to %s',
    (_, dirType, expectedDir) => {
      renderStep();
      fireEvent.change(screen.getByTestId('feast-project-dir-type'), {
        target: { value: dirType },
      });
      expect(setData).toHaveBeenCalledWith('projectDirType', dirType);
      expect(setData).toHaveBeenCalledWith('feastProjectDir', expectedDir);
    },
  );

  it('shows INIT fields and updates template and minimal toggle', () => {
    renderStep({
      projectDirType: ProjectDirType.INIT,
      feastProjectDir: { init: {} },
    });
    expect(screen.getByTestId('feast-init-template')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-init-template'), {
      target: { value: 'local' },
    });
    expect(setData).toHaveBeenCalledWith('feastProjectDir', {
      init: { template: 'local' },
    });

    setData.mockClear();
    fireEvent.click(screen.getByLabelText('Minimal initialization'));
    expect(setData).toHaveBeenCalledWith('feastProjectDir', {
      init: { minimal: true },
    });
  });

  it('shows GIT fields and updates URL, ref, path, and credentials', () => {
    renderStep(
      {
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: { git: { url: '' } },
      },
      { namespaceSecrets: ['git-creds'] },
    );
    expect(screen.getByTestId('feast-git-url')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('feast-git-url'), {
      target: { value: 'https://github.com/org/repo.git' },
    });
    expect(setData).toHaveBeenCalledWith('feastProjectDir', {
      git: { url: 'https://github.com/org/repo.git' },
    });

    setData.mockClear();
    fireEvent.change(screen.getByPlaceholderText('main'), {
      target: { value: 'develop' },
    });
    expect(setData).toHaveBeenCalledWith('feastProjectDir', {
      git: expect.objectContaining({ ref: 'develop' }),
    });

    setData.mockClear();
    fireEvent.change(screen.getByPlaceholderText('feature_repo'), {
      target: { value: 'features/store' },
    });
    expect(setData).toHaveBeenCalledWith('feastProjectDir', {
      git: expect.objectContaining({ featureRepoPath: 'features/store' }),
    });

    setData.mockClear();
    fireEvent.change(screen.getByTestId('feast-git-envfrom'), {
      target: { value: 'git-creds' },
    });
    expect(setData).toHaveBeenCalledWith('gitSecretName', 'git-creds');
  });

  it('shows error helper text when namespace loading fails', () => {
    render(
      <ProjectBasicsStep
        data={makeFormData()}
        setData={setData}
        existingProjectNames={[]}
        namespaceSecrets={[]}
        accessibleNamespaces={{
          namespaces: [],
          loaded: true,
          error: new Error('RBAC denied'),
        }}
      />,
    );
    expect(screen.getByText(/Failed to load projects/)).toBeInTheDocument();
    expect(screen.getByText(/RBAC denied/)).toBeInTheDocument();
  });

  it('shows feature repo path validation error for leading slash', () => {
    renderStep({
      projectDirType: ProjectDirType.GIT,
      feastProjectDir: { git: { url: 'https://example.com/repo', featureRepoPath: '/bad/path' } },
    });
    expect(screen.getByText(/must not start with a slash/i)).toBeInTheDocument();
  });

  it('does not clear namespace-scoped state when selecting the same namespace', () => {
    renderStep({ namespace: 'ns-a' });
    fireEvent.change(screen.getByTestId('feast-namespace-toggle'), {
      target: { value: 'ns-a' },
    });
    expect(setData).toHaveBeenCalledWith('namespace', 'ns-a');
    expect(setData).not.toHaveBeenCalledWith('registrySecretName', '');
  });
});
