import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowStatus } from '../../../utils/mlflowUtils';
import { agentObservability } from '../../../pages/agentObservability';
import { appChrome } from '../../../pages/appChrome';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({ projects = [PROJECT_A, PROJECT_B] }: { projects?: string[] } = {}) => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  interceptMlflowStatus();

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
      cy.visitWithLogin('/');
      appChrome.findMainContent().should('be.visible');

      agentObservability.navigate();

      agentObservability.shouldHaveAgentObservabilityUrl();
      agentObservability.findNavItem().should('have.attr', 'aria-current', 'page');
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

    it('should hide nav item when MLflow operator is removed', () => {
      const dscStatus = mockDscStatus({});
      dscStatus.components = {
        ...dscStatus.components,
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' },
      };
      cy.interceptOdh('GET /api/dsc/status', dscStatus);

      cy.visitWithLogin('/');
      agentObservability.findNavItem().should('not.exist');
    });
  });
});
