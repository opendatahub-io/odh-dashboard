import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import NotebookTableRow from '#~/pages/projects/screens/detail/notebooks/NotebookTableRow';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockNotebookState } from '#~/__mocks__/mockNotebookState';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { HardwareProfileBindingState } from '#~/concepts/hardwareProfiles/const';

jest.mock('#~/utilities/useNotification', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  })),
}));

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
const mockUseHardwareProfileBindingState = jest.mocked(useHardwareProfileBindingState);

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

describe('NotebookTableRow — DRA claim template', () => {
  const dra = { resourceClaimTemplateName: 'single-mig-partition' };
  const descriptionAnnotation = 'opendatahub.io/resource-claim-description';

  const renderExpandedRow = async (notebook = mockNotebookK8sResource({})) => {
    renderRow(notebook);
    await userEvent.click(
      within(screen.getByTestId('notebook-table-expand-cell')).getByRole('button'),
    );
  };

  const mockBoundProfile = (annotations?: Record<string, string>, withDRA = true) =>
    mockUseHardwareProfileBindingState.mockReturnValue([
      {
        profile: mockHardwareProfile({
          displayName: 'DRA Profile',
          ...(withDRA && { dra }),
          annotations,
        }),
      },
      true,
      undefined,
    ]);

  beforeEach(() => {
    mockUseKueueConfiguration.mockReturnValue(kueueDisabledConfig);
  });

  it('should show the template name of the bound DRA hardware profile', async () => {
    mockBoundProfile({
      [descriptionAnnotation]: 'Requests one partitioned GPU device for the workload.',
    });
    await renderExpandedRow();

    const draDetails = screen.getByTestId('hardware-profile-dra-details');
    expect(draDetails).not.toHaveTextContent('Device requests');
    expect(draDetails).toHaveTextContent('Tech Preview');
    expect(draDetails).toHaveTextContent('Claim template');
    expect(within(draDetails).getByTestId('hardware-profile-dra-template')).toHaveTextContent(
      'single-mig-partition',
    );
    expect(draDetails).not.toHaveTextContent(
      'Requests one partitioned GPU device for the workload.',
    );
    expect(screen.getByText('size-details')).toBeInTheDocument();
  });

  it("should show the workbench's own claim template when the profile's template has changed", async () => {
    mockBoundProfile({
      [descriptionAnnotation]: 'Requests one partitioned GPU device for the workload.',
    });
    await renderExpandedRow(
      mockNotebookK8sResource({
        opts: {
          spec: {
            template: {
              spec: {
                resourceClaims: [{ name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' }],
              },
            },
          },
        },
      }),
    );

    expect(screen.getByTestId('hardware-profile-dra-template')).toHaveTextContent('single-gpu');
  });

  it('should not show DRA details for a non-DRA hardware profile', async () => {
    mockBoundProfile({ [descriptionAnnotation]: 'Ignored without spec.dra' }, false);
    await renderExpandedRow();

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.queryByText('Device requests')).not.toBeInTheDocument();
    expect(screen.getByText('size-details')).toBeInTheDocument();
  });

  it.each<[string, ReturnType<typeof useHardwareProfileBindingState>]>([
    [
      'is deleted',
      [{ state: HardwareProfileBindingState.DELETED, profile: undefined }, true, undefined],
    ],
    ['is still loading', [null, false, undefined]],
    ['failed to load', [null, true, new Error('Failed to load hardware profiles')]],
  ])('should not show DRA details when the hardware profile %s', async (_, bindingState) => {
    mockUseHardwareProfileBindingState.mockReturnValue(bindingState);
    await renderExpandedRow();

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.getByText('size-details')).toBeInTheDocument();
  });
});
