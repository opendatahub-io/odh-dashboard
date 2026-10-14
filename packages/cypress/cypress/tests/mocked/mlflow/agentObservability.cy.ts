import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { interceptMlflowStatus, interceptMlflowStatusError } from '../../../utils/mlflowUtils';
import { agentObservability } from '../../../pages/agentObservability';
import { homePage } from '../../../pages/home/home';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({
  projects = [PROJECT_A, PROJECT_B],
  mlflowConfigured = true,
  userSetup = asProductAdminUser,
}: {
  projects?: string[];
  mlflowConfigured?: boolean;
  userSetup?: () => void;
} = {}) => {
  userSetup();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  interceptMlflowStatus(mlflowConfigured);

  const projectResources = projects.map((name) =>
    mockProjectK8sResource({ k8sName: name, displayName: name }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList(projectResources));
  if (projectResources.length > 0) {
    cy.interceptK8s(ProjectModel, projectResources[0]);
  }
};

describe('Agent observability page', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Page chrome and navigation', () => {
    it('should display page title and Launch MLflow button', () => {
      agentObservability.visit(PROJECT_A);
      agentObservability
        .findPageTitle()
        .should('be.visible')
        .should('contain', 'Agent observability');
      agentObservability
        .findLaunchMlflowButton()
        .should('be.visible')
        .should('have.attr', 'href', `/mlflow/#/?workspace=${PROJECT_A}`)
        .should('have.attr', 'target', '_blank');
    });

    it('should navigate via the Observe & monitor nav section and show active nav item', () => {
      homePage.visit();

      agentObservability.navigate();

      agentObservability.shouldHaveAgentObservabilityUrl();
      agentObservability.findNavItem().should('have.attr', 'aria-current', 'page');
    });

    it('should show the nav item and page to a non-admin user', () => {
      initIntercepts({ userSetup: asProjectEditUser });
      homePage.visit();

      agentObservability.navigate();

      agentObservability.shouldHaveAgentObservabilityUrl();
      agentObservability.findPageTitle().should('contain', 'Agent observability');
    });
  });

  describe('Project selector', () => {
    it('should stay on Agent observability when switching projects', () => {
      agentObservability.visit(PROJECT_A);
      agentObservability.projectDropdown.findToggleButton().should('contain', PROJECT_A);

      agentObservability.projectDropdown.openAndSelectItem(PROJECT_B, true);
      agentObservability.shouldHaveWorkspace(PROJECT_B);
    });
  });

  describe('Empty and error states', () => {
    it('should show the no-projects empty state when the user has no projects', () => {
      initIntercepts({ projects: [] });
      agentObservability.visit();
      agentObservability.findNoProjectsEmptyState().should('be.visible');
    });

    it('should show error state for invalid workspace', () => {
      const invalidWorkspace = 'nonexistent-project';
      agentObservability.visit(invalidWorkspace);
      agentObservability
        .findErrorEmptyState()
        .should('be.visible')
        .should('contain', invalidWorkspace);
    });

    it('should show admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false });
      agentObservability.visit(PROJECT_A);
      agentObservability.findNotConfiguredAdminEmptyState().should('be.visible');
      agentObservability.findNotConfiguredEmptyState().should('not.exist');
      agentObservability.findMlflowUnavailableState().should('not.exist');
    });

    it('should show non-admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false, userSetup: asProjectEditUser });
      agentObservability.visit(PROJECT_A);
      agentObservability.findNotConfiguredEmptyState().should('be.visible');
      agentObservability.findNotConfiguredAdminLink().should('be.visible');
      agentObservability.findNotConfiguredAdminEmptyState().should('not.exist');
    });

    it('should show unavailable empty state when MLflow BFF status check fails', () => {
      interceptMlflowStatusError();
      agentObservability.visit(PROJECT_A);
      cy.wait('@mlflowStatusError');
      agentObservability.findMlflowUnavailableState().should('be.visible');
      agentObservability.findNotConfiguredEmptyState().should('not.exist');
    });

    it('should hide nav item when MLflow operator is removed', () => {
      const dscStatus = mockDscStatus({});
      dscStatus.components = {
        ...dscStatus.components,
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' },
      };
      cy.interceptOdh('GET /api/dsc/status', dscStatus);

      homePage.visit();
      agentObservability.findNavItem().should('not.exist');
    });
  });
});
