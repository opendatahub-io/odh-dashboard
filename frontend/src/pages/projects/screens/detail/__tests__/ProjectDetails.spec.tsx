import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
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
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';

jest.mock('#~/pages/ApplicationsPage', () =>
  // eslint-disable-next-line react/display-name
  ({ children }: React.PropsWithChildren) => <div>{children}</div>,
);

jest.mock('#~/pages/projects/components/GenericHorizontalBar', () => () => null);

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

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
  customCondition: () => false,
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
    mockUseDeploymentsTab.mockReturnValue([]);
    mockUseProjectPermissionsTabVisible.mockReturnValue([false, true]);
    mockUseProjectRolesTabVisible.mockReturnValue([false, true]);
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
