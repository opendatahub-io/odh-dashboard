import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { GenericObjectState } from '@odh-dashboard/ui-core/utilities/useGenericObjectState';
import CreateFeatureStoreProjectWizard from '../CreateFeatureStoreProjectWizard';
import useCreateFeatureStoreProjectState from '../useCreateFeatureStoreProjectState';
import useNamespaceSecrets from '../../../hooks/useNamespaceSecrets';
import useNamespaceConfigMaps from '../../../hooks/useNamespaceConfigMaps';
import {
  FeatureStoreFormData,
  ProjectDirType,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
  RemoteRegistryType,
} from '../types';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../useCreateFeatureStoreProjectState');
jest.mock('../../../hooks/useNamespaceSecrets');
jest.mock('../../../hooks/useNamespaceConfigMaps');

jest.mock('../steps/ProjectBasicsStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-project-basics-step" />,
}));

jest.mock('../steps/RegistryStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-registry-step" />,
}));

const useCreateFeatureStoreProjectStateMock = useCreateFeatureStoreProjectState as jest.Mock;
const useNamespaceSecretsMock = useNamespaceSecrets as jest.Mock;
const useNamespaceConfigMapsMock = useNamespaceConfigMaps as jest.Mock;

const makeDefaultFormData = (
  overrides: Partial<FeatureStoreFormData> = {},
): FeatureStoreFormData => ({
  feastProject: 'test-project',
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
      local: {
        server: { restAPI: true, grpc: true },
      },
    },
  },
  ...overrides,
});

describe('CreateFeatureStoreProjectWizard', () => {
  const user = userEvent.setup();
  let setDataMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setDataMock = jest.fn();
    const data = makeDefaultFormData();
    useCreateFeatureStoreProjectStateMock.mockReturnValue([
      data,
      setDataMock,
    ] as unknown as GenericObjectState<FeatureStoreFormData>);
    useNamespaceSecretsMock.mockReturnValue({ secrets: ['secret-a', 'secret-b'] });
    useNamespaceConfigMapsMock.mockReturnValue({ configMaps: ['cm-a'] });
  });

  const renderWizard = (
    props: Partial<React.ComponentProps<typeof CreateFeatureStoreProjectWizard>> = {},
  ) =>
    render(
      <MemoryRouter>
        <CreateFeatureStoreProjectWizard
          existingProjectNames={[]}
          hasUILabeledStore={false}
          primaryStore={undefined}
          {...props}
        />
      </MemoryRouter>,
    );

  it('renders all 5 wizard steps, shows Details content, and has no submit button', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Online & offline stores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-project-basics-step')).toBeInTheDocument();
    expect(screen.queryByTestId('feast-create-submit')).not.toBeInTheDocument();
  });

  it('enables Next button when Details step is valid', () => {
    renderWizard();
    expect(screen.getByTestId('feast-wizard-next')).not.toBeDisabled();
  });

  it.each([
    ['project name is empty', { feastProject: '' }, []],
    ['namespace is empty', { namespace: '' }, []],
    ['project name is a duplicate', {}, ['test-project']],
  ] as [string, Partial<FeatureStoreFormData>, string[]][])(
    'disables Next button when %s',
    (_, overrides, existingNames) => {
      useCreateFeatureStoreProjectStateMock.mockReturnValue([
        makeDefaultFormData(overrides),
        setDataMock,
      ]);
      renderWizard({ existingProjectNames: existingNames });
      expect(screen.getByTestId('feast-wizard-next')).toBeDisabled();
    },
  );

  it('disables Next button on the Registry step (placeholder next step)', async () => {
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Registry' }));
    expect(screen.getByTestId('mock-registry-step')).toBeInTheDocument();
    expect(screen.getByTestId('feast-wizard-next')).toBeDisabled();
  });

  it('navigates to overview on cancel', async () => {
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/feature-store/overview'));
  });

  it('pre-fills remote registry when existing primary store exists', () => {
    const primaryStore = {
      apiVersion: 'feast.dev/v1alpha1',
      kind: 'FeatureStore',
      metadata: { name: 'primary-fs', namespace: 'primary-ns' },
      spec: { feastProject: 'primary' },
    } as unknown as import('../../../k8sTypes').FeatureStoreKind;
    renderWizard({
      hasUILabeledStore: true,
      primaryStore,
    });
    expect(setDataMock).toHaveBeenCalledWith('registryType', RegistryType.REMOTE);
    expect(setDataMock).toHaveBeenCalledWith('remoteRegistryType', RemoteRegistryType.FEAST_REF);
    expect(setDataMock).toHaveBeenCalledWith(
      'services',
      expect.objectContaining({
        registry: {
          remote: {
            feastRef: { name: 'primary-fs', namespace: 'primary-ns' },
          },
        },
      }),
    );
  });
});
