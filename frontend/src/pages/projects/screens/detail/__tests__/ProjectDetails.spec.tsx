import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import ProjectDetails from '#~/pages/projects/screens/detail/ProjectDetails';
import {
  ProjectDetailsContext,
  type ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { useDeploymentsTab } from '#~/concepts/projects/projectDetails/useDeploymentsTab';
import {
  useProjectPermissionsTabVisible,
  useProjectRolesTabVisible,
} from '#~/concepts/projects/accessChecks';
import useNotification from '#~/utilities/useNotification';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

jest.mock('#~/pages/projects/components/GenericHorizontalBar', () => () => null);

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/context/WorkingProjectContext', () => ({
  useWorkingProject: jest.fn(),
}));

jest.mock('#~/utilities/useNotification', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn().mockReturnValue([]),
  isProjectDetailsSettingsCardExtension: jest.fn(),
}));

jest.mock('#~/concepts/projects/projectDetails/useDeploymentsTab', () => ({
  useDeploymentsTab: jest.fn(),
}));

jest.mock('#~/concepts/projects/accessChecks', () => ({
  useProjectPermissionsTabVisible: jest.fn(),
  useProjectRolesTabVisible: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/detail/useCheckLogoutParams', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/detail/ProjectActions', () => () => null);

const mockUseKueueConfiguration = jest.mocked(useKueueConfiguration);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseWorkingProject = jest.mocked(useWorkingProject);
const mockUseNotification = jest.mocked(useNotification);
const mockUseDeploymentsTab = jest.mocked(useDeploymentsTab);
const mockUseProjectPermissionsTabVisible = jest.mocked(useProjectPermissionsTabVisible);
const mockUseProjectRolesTabVisible = jest.mocked(useProjectRolesTabVisible);

const mockProject = mockProjectK8sResource({ k8sName: 'test-project' });

const defaultAreaAvailability = {
  status: false,
  devFlags: {},
  featureFlags: {},
  reliantAreas: {},
  requiredComponents: {},
  requiredCapabilities: {},
};

const renderProjectDetails = () =>
  render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider
        value={{ currentProject: mockProject } as ProjectDetailsContextType}
      >
        <ProjectDetails />
      </ProjectDetailsContext.Provider>
    </MemoryRouter>,
  );

describe('ProjectDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue(defaultAreaAvailability);
    mockUseWorkingProject.mockReturnValue({
      status: 'provider-absent',
      projects: [],
      activeProject: null,
      selectProject: jest.fn(),
    });
    mockUseNotification.mockReturnValue({
      info: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    });
    mockUseDeploymentsTab.mockReturnValue([]);
    mockUseProjectPermissionsTabVisible.mockReturnValue([false, true]);
    mockUseProjectRolesTabVisible.mockReturnValue([false, true]);
  });

  describe('Working project mismatch', () => {
    it('should show a banner for a different working project and switch to the viewed project', () => {
      const selectProject = jest.fn();
      const info = jest.fn();
      mockUseNotification.mockReturnValue({
        info,
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
      });
      mockUseIsAreaAvailable.mockImplementation((area) => ({
        ...defaultAreaAvailability,
        status: area === SupportedArea.UNIFIED_PROJECT_SELECTOR,
      }));
      mockUseWorkingProject.mockReturnValue({
        status: 'listed',
        projects: [
          { name: 'test-project' },
          { name: 'another-project', displayName: 'Another project' },
        ],
        activeProject: { name: 'another-project', displayName: 'Another project' },
        selectProject,
      });
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: false,
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: false,
        kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      });

      const { rerender } = renderProjectDetails();
      const alert = screen.getByTestId('working-project-mismatch-alert');
      expect(alert).toHaveTextContent('Another project');
      expect(screen.getByText(/You are viewing the details of a project/)).toHaveClass(
        'pf-v6-u-font-weight-normal',
      );
      expect(screen.getByText('Another project')).toHaveClass('pf-v6-u-font-weight-bold');
      fireEvent.click(screen.getByRole('button', { name: 'Switch working project' }));
      expect(selectProject).toHaveBeenCalledWith({ name: 'test-project' });
      expect(info).toHaveBeenCalledWith('Working project updated', expect.anything());
      const message = info.mock.calls[0][1] as React.ReactNode;
      render(<>{message}</>);
      expect(screen.getByText(/You're now working in/)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toHaveProperty('tagName', 'STRONG');

      mockUseWorkingProject.mockReturnValue({
        status: 'listed',
        projects: [{ name: 'test-project' }],
        activeProject: { name: 'test-project' },
        selectProject,
      });
      rerender(
        <MemoryRouter>
          <ProjectDetailsContext.Provider
            value={{ currentProject: mockProject } as ProjectDetailsContextType}
          >
            <ProjectDetails />
          </ProjectDetailsContext.Provider>
        </MemoryRouter>,
      );
      expect(screen.queryByTestId('working-project-mismatch-alert')).not.toBeInTheDocument();
    });

    it('should not show a mismatch banner when the UPS gate is off', () => {
      mockUseWorkingProject.mockReturnValue({
        status: 'listed',
        projects: [{ name: 'another-project' }],
        activeProject: { name: 'another-project' },
        selectProject: jest.fn(),
      });
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: false,
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: false,
        kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      });
      renderProjectDetails();
      expect(screen.queryByTestId('working-project-mismatch-alert')).not.toBeInTheDocument();
    });
  });

  describe('Kueue managed indicator', () => {
    it('should show positive Kueue indicator when project is Kueue-managed and feature is enabled', () => {
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: false,
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: true,
        kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
      });

      renderProjectDetails();

      expect(screen.getByTestId('kueue-managed-alert-project-details')).toBeInTheDocument();
      expect(screen.queryByTestId('kueue-disabled-alert-project-details')).not.toBeInTheDocument();
    });

    it('should show disabled alert and not the managed indicator when Kueue feature is disabled', () => {
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: true,
        isKueueFeatureEnabled: false,
        isProjectKueueEnabled: true,
        kueueFilteringState: KueueFilteringState.NO_PROFILES,
      });

      renderProjectDetails();

      expect(screen.getByTestId('kueue-disabled-alert-project-details')).toBeInTheDocument();
      expect(screen.queryByTestId('kueue-managed-alert-project-details')).not.toBeInTheDocument();
    });

    it('should hide the managed indicator when the close button is clicked', () => {
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: false,
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: true,
        kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
      });

      renderProjectDetails();

      expect(screen.getByTestId('kueue-managed-alert-project-details')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('kueue-managed-alert-close'));
      expect(screen.queryByTestId('kueue-managed-alert-project-details')).not.toBeInTheDocument();
    });

    it('should show neither indicator when project is not Kueue-managed', () => {
      mockUseKueueConfiguration.mockReturnValue({
        isKueueDisabled: false,
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: false,
        kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      });

      renderProjectDetails();

      expect(screen.queryByTestId('kueue-managed-alert-project-details')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kueue-disabled-alert-project-details')).not.toBeInTheDocument();
    });
  });
});
