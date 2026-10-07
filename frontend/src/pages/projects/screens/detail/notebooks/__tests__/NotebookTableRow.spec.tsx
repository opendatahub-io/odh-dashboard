import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import {
  getResourceClaim,
  getResourceClaimTemplate,
} from '@odh-dashboard/k8s-core/api/resourceClaims';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { mock403Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { getPodsForNotebook } from '#~/api';
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

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  getPodsForNotebook: jest.fn(),
}));

jest.mock('@odh-dashboard/k8s-core/api/resourceClaims', () => ({
  getResourceClaim: jest.fn(),
  getResourceClaimTemplate: jest.fn(),
}));

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
const getPodsForNotebookMock = jest.mocked(getPodsForNotebook);
const getResourceClaimMock = jest.mocked(getResourceClaim);
const getResourceClaimTemplateMock = jest.mocked(getResourceClaimTemplate);

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

describe('NotebookTableRow — Claims cell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKueueConfiguration.mockReturnValue(kueueDisabledConfig);
  });

  const expandRow = async () => {
    await userEvent.click(
      within(screen.getByTestId('notebook-table-expand-cell')).getByRole('button'),
    );
  };

  it('should leave a workbench without claims unchanged and make no Pod or claim requests', async () => {
    renderRow();
    await expandRow();

    expect(screen.queryByTestId('claims-section')).not.toBeInTheDocument();
    expect(screen.queryByText('Claims')).not.toBeInTheDocument();
    expect(getPodsForNotebookMock).not.toHaveBeenCalled();
    expect(getResourceClaimMock).not.toHaveBeenCalled();
    expect(getResourceClaimTemplateMock).not.toHaveBeenCalled();
  });

  it('should render the Claims cell for a workbench with claims only once expanded', async () => {
    getPodsForNotebookMock.mockResolvedValue([]);
    getResourceClaimTemplateMock.mockResolvedValue(
      mockResourceClaimTemplate({ name: 'gpu-template', namespace: 'test-project' }),
    );
    renderRow(
      mockNotebookK8sResource({
        resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: 'gpu-template' }],
        containerClaims: [{ name: 'gpu' }],
      }),
    );

    expect(screen.queryByTestId('claims-section')).not.toBeInTheDocument();
    expect(getPodsForNotebookMock).not.toHaveBeenCalled();

    await expandRow();

    expect(screen.getByTestId('claims-section')).toBeInTheDocument();
    await waitFor(() => expect(getPodsForNotebookMock).toHaveBeenCalledTimes(1));
    expect(getPodsForNotebookMock).toHaveBeenCalledWith(
      'test-project',
      'test-notebook',
      expect.anything(),
    );
    expect(await screen.findByTestId('claim-item-gpu-status')).toHaveTextContent('No running pod');
    expect(await screen.findByTestId('claim-item-gpu-request-0-device-class')).toHaveTextContent(
      'gpu.example.com',
    );
    expect(getResourceClaimTemplateMock).toHaveBeenCalledWith(
      'test-project',
      'gpu-template',
      expect.anything(),
    );
    expect(getResourceClaimMock).not.toHaveBeenCalled();
  });

  it('should show an unknown Pod state under a warning when the Pod list is forbidden', async () => {
    getPodsForNotebookMock.mockRejectedValue(new K8sStatusError(mock403Error({})));
    getResourceClaimTemplateMock.mockResolvedValue(
      mockResourceClaimTemplate({ name: 'gpu-template', namespace: 'test-project' }),
    );
    renderRow(
      mockNotebookK8sResource({
        resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: 'gpu-template' }],
        containerClaims: [{ name: 'gpu' }],
      }),
    );
    await expandRow();

    expect(await screen.findByTestId('claims-section-refresh-error')).toHaveTextContent(
      '403 Forbidden',
    );
    expect(screen.queryByTestId('claims-section-error')).not.toBeInTheDocument();
    expect(await screen.findByTestId('claim-item-gpu-status')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      'Pod details could not be loaded.',
    );
    expect(screen.queryByText('No running pod')).not.toBeInTheDocument();
    expect(await screen.findByTestId('claim-item-gpu-request-0-device-class')).toHaveTextContent(
      'gpu.example.com',
    );
  });
});
