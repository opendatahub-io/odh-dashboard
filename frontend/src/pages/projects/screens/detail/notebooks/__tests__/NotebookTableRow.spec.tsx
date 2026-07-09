import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import NotebookTableRow from '#~/pages/projects/screens/detail/notebooks/NotebookTableRow';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockNotebookState } from '#~/__mocks__/mockNotebookState';
import { KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/useNotebookImage', () =>
  jest.fn(() => [undefined, true, undefined]),
);

jest.mock('#~/concepts/notebooks/utils', () => ({
  ...jest.requireActual('#~/concepts/notebooks/utils'),
  useNotebookHardwareProfile: jest.fn(() => ({
    podSpecOptionsState: {
      podSpecOptions: { resources: {} },
      loaded: true,
      loadError: undefined,
    },
    profileState: { loaded: true, loadError: undefined, hardwareProfile: undefined },
  })),
  isWorkbenchMigrated: jest.fn(() => true),
}));

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileBindingState', () => ({
  useHardwareProfileBindingState: jest.fn(() => [undefined, true, undefined]),
}));

jest.mock('#~/pages/projects/notebook/useStopNotebookModalAvailability', () =>
  jest.fn(() => [false]),
);

jest.mock('#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores', () => ({
  useWorkbenchFeatureStores: jest.fn(() => ({ featureStores: [], loaded: true })),
}));

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
}));

jest.mock('#~/pages/projects/notebook/NotebookRouteLink', () => ({
  __esModule: true,
  default: () => <a href="/">test-notebook</a>,
}));

jest.mock('#~/concepts/hardwareProfiles/HardwareProfileTableColumn', () => ({
  __esModule: true,
  default: () => <div>hardware-profile</div>,
}));

jest.mock('#~/pages/projects/notebook/NotebookStateStatus', () => ({
  __esModule: true,
  default: () => <div>status</div>,
}));

jest.mock('#~/pages/projects/notebook/NotebookActionsColumn', () => ({
  NotebookActionsColumn: () => <div>actions</div>,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  StateActionToggle: () => <div>toggle</div>,
  ResourceNameTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookImageDisplayName', () => ({
  NotebookImageDisplayName: () => <div>image-display-name</div>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookStorageBars', () => ({
  __esModule: true,
  default: () => <div>storage-bars</div>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookSizeDetails', () => ({
  __esModule: true,
  default: () => <div>size-details</div>,
}));

jest.mock('#~/pages/projects/screens/detail/notebooks/NotebookFeatureStoreList', () => ({
  __esModule: true,
  default: () => <div>feature-store-list</div>,
}));

const mockUseKueueConfiguration = jest.mocked(useKueueConfiguration);

const kueueEnabledConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
};

const kueueDisabledConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: false,
  isProjectKueueEnabled: false,
  kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
};

const kueueEnabledGloballyButNotProject = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: false,
  kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
};

const mockProject = mockProjectK8sResource({ k8sName: 'test-project', enableKueue: true });
const mockContextValue = {
  currentProject: mockProject,
  notebooks: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  pvcs: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  connections: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  servingRuntimes: {
    data: { items: [], hasNonDashboardItems: false },
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  servingRuntimeTemplates: [[], true, undefined],
  servingRuntimeTemplateOrder: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  servingRuntimeTemplateDisablement: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  inferenceServices: {
    data: { items: [], hasNonDashboardItems: false },
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
  serverSecrets: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  projectSharingRB: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  groups: [[], true, undefined],
  projectHardwareProfiles: [[], true, undefined],
  localQueues: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  kueueStatusByNotebookName: {},
  isKueueLoaded: true,
  filterTokens: jest.fn(() => []),
};

const renderRow = (notebook = mockNotebookK8sResource({})) => {
  const notebookState = mockNotebookState(notebook);
  return render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider
        value={mockContextValue as unknown as ProjectDetailsContextType}
      >
        <table>
          <NotebookTableRow
            obj={notebookState}
            rowIndex={0}
            onNotebookDelete={jest.fn()}
            canEnablePipelines={false}
            showOutOfDateElyraInfo={false}
          />
        </table>
      </ProjectDetailsContext.Provider>
    </MemoryRouter>,
  );
};

describe('NotebookTableRow — Kueue anomaly indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the anomaly indicator when project is Kueue-enabled and notebook has no queue label', () => {
    mockUseKueueConfiguration.mockReturnValue(kueueEnabledConfig);

    const notebook = mockNotebookK8sResource({});
    renderRow(notebook);

    expect(screen.getByTestId('kueue-anomaly-indicator')).toBeInTheDocument();
  });

  it('does not show the anomaly indicator when notebook has the queue label', () => {
    mockUseKueueConfiguration.mockReturnValue(kueueEnabledConfig);

    const notebook = mockNotebookK8sResource({
      opts: { metadata: { labels: { [KUEUE_QUEUE_LABEL]: 'my-local-queue' } } },
    });
    renderRow(notebook);

    expect(screen.queryByTestId('kueue-anomaly-indicator')).not.toBeInTheDocument();
  });

  it.each([
    ['Kueue feature is globally disabled', kueueDisabledConfig],
    ['project is not Kueue-managed', kueueEnabledGloballyButNotProject],
  ])('does not show the anomaly indicator when %s', (_, config) => {
    mockUseKueueConfiguration.mockReturnValue(config);

    renderRow();

    expect(screen.queryByTestId('kueue-anomaly-indicator')).not.toBeInTheDocument();
  });
});

describe('NotebookTableRow — Table row display (converted from Cypress)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKueueConfiguration.mockReturnValue(kueueDisabledConfig);
  });

  it('should display project-scoped label when notebook uses project image', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'notebooks.opendatahub.io/last-image-selection': 'test-imagestream:1.2',
            'opendatahub.io/image-display-name': 'Test Image',
            'opendatahub.io/hardware-profile-name': 'small-profile',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'test-notebook',
                  image: 'test-project/test-imagestream:1.2',
                },
              ],
            },
          },
        },
      },
    });

    renderRow(notebook);

    expect(screen.getByText('test-notebook')).toBeInTheDocument();
    expect(screen.getByText('image-display-name')).toBeInTheDocument();
    expect(screen.getByText('hardware-profile')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('should render notebook image display name', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/image-display-name': 'TensorFlow',
          },
        },
      },
    });

    renderRow(notebook);

    expect(screen.getByText('image-display-name')).toBeInTheDocument();
  });

  it('should render hardware profile information', () => {
    const notebook = mockNotebookK8sResource({
      opts: {
        metadata: {
          annotations: {
            'opendatahub.io/hardware-profile-name': 'large-profile',
          },
        },
      },
    });

    renderRow(notebook);

    expect(screen.getByText('hardware-profile')).toBeInTheDocument();
  });

  it('should render notebook status', () => {
    const notebook = mockNotebookK8sResource({});

    renderRow(notebook);

    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('should render notebook route link', () => {
    const notebook = mockNotebookK8sResource({});

    renderRow(notebook);

    expect(screen.getByRole('link', { name: /test-notebook/i })).toBeInTheDocument();
  });

  it('should render all table row components together', () => {
    const notebook = mockNotebookK8sResource({});

    renderRow(notebook);

    // Verify all key components render in the table row
    expect(screen.getByText('test-notebook')).toBeInTheDocument();
    expect(screen.getByText('image-display-name')).toBeInTheDocument();
    expect(screen.getByText('hardware-profile')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('toggle')).toBeInTheDocument();
    expect(screen.getByText('actions')).toBeInTheDocument();
  });
});
