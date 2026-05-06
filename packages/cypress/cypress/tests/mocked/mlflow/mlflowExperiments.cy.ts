import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowStatus } from '../../../utils/mlflowUtils';
import { mlflowExperiments } from '../../../pages/mlflowExperiments';
import { appChrome } from '../../../pages/appChrome';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({ mlflowConfigured = true }: { mlflowConfigured?: boolean } = {}) => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  interceptMlflowStatus(mlflowConfigured);

  const projectA = mockProjectK8sResource({ k8sName: PROJECT_A, displayName: PROJECT_A });
  const projectB = mockProjectK8sResource({ k8sName: PROJECT_B, displayName: PROJECT_B });
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([projectA, projectB]));
  cy.interceptK8s(ProjectModel, projectA);
};

describe('MLflow Experiments page wrapper', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Page chrome and navigation', () => {
    it('should display page title and Launch MLflow button', () => {
      mlflowExperiments.visit(PROJECT_A);
      mlflowExperiments.findPageTitle().should('be.visible');
      mlflowExperiments
        .findLaunchMlflowButton()
        .should('be.visible')
        .should('have.attr', 'href', `/mlflow/#/?workspace=${PROJECT_A}`)
        .should('have.attr', 'target', '_blank');
    });

    it('should navigate via sidebar and show active nav item', () => {
      cy.visitWithLogin('/');
      appChrome.findMainContent().should('be.visible');

      mlflowExperiments.findNavSection().click();
      mlflowExperiments.navigate();

      mlflowExperiments.shouldHaveExperimentsUrl();
      mlflowExperiments.findNavItem().should('have.attr', 'aria-current', 'page');
    });
  });

  describe('Project selector', () => {
    it('should switch workspace when selecting a different project', () => {
      mlflowExperiments.visit(PROJECT_A);
      mlflowExperiments.findProjectSelector().should('contain', PROJECT_A);

      mlflowExperiments.findProjectSelector().click();
      mlflowExperiments.findProjectInDropdown(PROJECT_B).click();
      mlflowExperiments.shouldHaveWorkspace(PROJECT_B);

      mlflowExperiments.findProjectSelector().click();
      mlflowExperiments.findProjectInDropdown(PROJECT_A).click();
      mlflowExperiments.shouldHaveWorkspace(PROJECT_A);
    });
  });

  describe('Dark mode toggle', () => {
    it('should sync localStorage on toggle', () => {
      mlflowExperiments.visit(PROJECT_A);

      appChrome.findDarkThemeToggle().click();
      mlflowExperiments.getMlflowDarkModeStorageValue().should('equal', 'true');

      appChrome.findLightThemeToggle().click();
      mlflowExperiments.getMlflowDarkModeStorageValue().should('equal', 'false');
    });
  });

  describe('Error states', () => {
    it('should show error state for invalid workspace', () => {
      const invalidWorkspace = 'nonexistent-project';
      mlflowExperiments.visit(invalidWorkspace);
      mlflowExperiments
        .findErrorEmptyState()
        .should('be.visible')
        .should('contain', invalidWorkspace);
    });

    it('should show unavailable state when MLflow is not configured', () => {
      initIntercepts({ mlflowConfigured: false });
      mlflowExperiments.visit(PROJECT_A);
      mlflowExperiments.findMlflowUnavailableState().should('be.visible');
    });

    it('should hide nav item when MLflow operator is removed', () => {
      const dscStatus = mockDscStatus({});
      dscStatus.components = {
        ...dscStatus.components,
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' },
      };
      cy.interceptOdh('GET /api/dsc/status', dscStatus);

      cy.visitWithLogin('/');
      mlflowExperiments.findNavItem().should('not.exist');
    });
  });
});
