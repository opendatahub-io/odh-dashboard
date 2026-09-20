import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { GenericObjectState } from '@odh-dashboard/ui-core/utilities/useGenericObjectState';
import CreateFeatureStoreProjectWizard from '../CreateFeatureStoreProjectWizard';
import useCreateFeatureStoreProjectState from '../useCreateFeatureStoreProjectState';
import useNamespaceSecrets from '../../../hooks/useNamespaceSecrets';
import useNamespaceConfigMaps from '../../../hooks/useNamespaceConfigMaps';
import { createFeatureStore } from '../../../api/featureStores';
import { buildFormSpec } from '../utils';
import { featureStoreDeployRoute } from '../../../routes';
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
jest.mock('../../../hooks/useAccessibleNamespaces', () => ({
  __esModule: true,
  default: () => ({
    namespaces: [{ name: 'test-ns', displayName: 'test-ns' }],
    loaded: true,
  }),
}));

jest.mock('../steps/ProjectBasicsStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-project-basics-step" />,
}));

jest.mock('../steps/RegistryStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-registry-step" />,
}));

jest.mock('../steps/StoreConfigStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-store-config-step" />,
}));

jest.mock('../steps/AdvancedStep', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-advanced-step" />,
}));

jest.mock('../steps/ReviewStep', () => ({
  __esModule: true,
  default: ({ submitError }: { submitError?: Error }) => (
    <div data-testid="mock-review-step">
      {submitError && <div data-testid="review-submit-error">{submitError.message}</div>}
    </div>
  ),
}));

jest.mock('../utils', () => ({
  buildFormSpec: jest.fn(() => ({
    feastProject: 'test-project',
    namespace: 'test-ns',
  })),
  formSpecToYaml: jest.fn(() => ''),
}));

jest.mock('../../../api/featureStores', () => ({
  createFeatureStore: jest.fn(() =>
    Promise.resolve({
      metadata: { name: 'test-project', namespace: 'test-ns' },
      spec: { feastProject: 'test-project' },
    }),
  ),
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

  it('renders all 5 wizard steps and shows Details content', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Online & offline stores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-project-basics-step')).toBeInTheDocument();
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

  it('enables Next on Registry step when validation passes', async () => {
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Registry' }));
    expect(screen.getByTestId('mock-registry-step')).toBeInTheDocument();
    expect(screen.getByTestId('feast-wizard-next')).not.toBeDisabled();
  });

  it('shows Create button on Review step', async () => {
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByTestId('feast-wizard-submit')).toBeInTheDocument();
    expect(screen.getByTestId('feast-wizard-submit')).toHaveTextContent('Create feature store');
  });

  it('navigates back on cancel', async () => {
    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  describe('submit flow', () => {
    const navigateToReviewAndSubmit = async () => {
      renderWizard();
      await user.click(screen.getByRole('button', { name: 'Review' }));
      const submitBtn = screen.getByTestId('feast-wizard-submit');
      await user.click(submitBtn);
      return submitBtn;
    };

    it('calls createFeatureStore with the built spec and navigates to the deploy page on success', async () => {
      await navigateToReviewAndSubmit();

      await waitFor(() => {
        expect(buildFormSpec).toHaveBeenCalledWith(expect.anything(), true);
      });
      expect(createFeatureStore).toHaveBeenCalledWith({
        feastProject: 'test-project',
        namespace: 'test-ns',
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          featureStoreDeployRoute('test-ns', 'test-project'),
        );
      });
    });

    it('navigates using the returned resource identity when it differs from form values', async () => {
      (createFeatureStore as jest.Mock).mockResolvedValueOnce({
        metadata: { name: 'mutated-name', namespace: 'mutated-ns' },
        spec: { feastProject: 'mutated-name' },
      });

      await navigateToReviewAndSubmit();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          featureStoreDeployRoute('mutated-ns', 'mutated-name'),
        );
      });
    });

    it('renders submit error alert when createFeatureStore rejects', async () => {
      (createFeatureStore as jest.Mock).mockRejectedValueOnce(new Error('API quota exceeded'));

      await navigateToReviewAndSubmit();

      await waitFor(() => {
        expect(screen.getByTestId('review-submit-error')).toBeInTheDocument();
      });
      expect(screen.getByText('API quota exceeded')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/create/deploy'));
    });

    it('disables submit button while the promise is pending and prevents duplicate calls', async () => {
      let resolveCreate!: (val: unknown) => void;
      (createFeatureStore as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );

      renderWizard();
      await user.click(screen.getByRole('button', { name: 'Review' }));
      const submitBtn = screen.getByTestId('feast-wizard-submit');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
      expect(createFeatureStore).toHaveBeenCalledTimes(1);

      await user.click(submitBtn);
      expect(createFeatureStore).toHaveBeenCalledTimes(1);

      resolveCreate({
        metadata: { name: 'test-project', namespace: 'test-ns' },
      });
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });
  });

  it.each([
    ['disabled on first step (Details)', undefined, true],
    ['enabled on non-first step (Registry)', 'Registry', false],
  ])('Back button is %s', async (_, navigateTo, shouldBeDisabled) => {
    renderWizard();
    if (navigateTo) {
      await user.click(screen.getByRole('button', { name: navigateTo }));
    }
    const backBtn = screen.getByRole('button', { name: 'Back' });
    if (shouldBeDisabled) {
      expect(backBtn).toBeDisabled();
    } else {
      expect(backBtn).not.toBeDisabled();
    }
  });

  it('does not navigate on cancel when submitting', async () => {
    let resolveCreate!: (val: unknown) => void;
    (createFeatureStore as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    renderWizard();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await user.click(screen.getByTestId('feast-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    resolveCreate({
      metadata: { name: 'test-project', namespace: 'test-ns' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
    });
  });

  it('does not pre-fill when hasUILabeledStore is false', () => {
    renderWizard({ hasUILabeledStore: false, primaryStore: undefined });
    expect(setDataMock).not.toHaveBeenCalledWith('registryType', expect.anything());
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
