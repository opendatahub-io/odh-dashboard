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
import { promptManagement } from '../../../pages/promptManagement';
import { appChrome } from '../../../pages/appChrome';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({
  mlflowConfigured = true,
  genAiStudio = true,
}: { mlflowConfigured?: boolean; genAiStudio?: boolean } = {}) => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ genAiStudio }));
  interceptMlflowStatus(mlflowConfigured);

  const projectA = mockProjectK8sResource({ k8sName: PROJECT_A, displayName: PROJECT_A });
  const projectB = mockProjectK8sResource({ k8sName: PROJECT_B, displayName: PROJECT_B });
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([projectA, projectB]));
  cy.interceptK8s(ProjectModel, projectA);
};

describe('Prompt Management page wrapper', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Page chrome', () => {
    it('should display page title and Launch MLflow button', () => {
      promptManagement.visit(PROJECT_A);
      promptManagement.findPageTitle().should('be.visible');
      promptManagement
        .findLaunchMlflowButton()
        .should('be.visible')
        .should('have.attr', 'href', `/mlflow/#/?workspace=${PROJECT_A}`)
        .should('have.attr', 'target', '_blank');
    });
  });

  describe('Project selector', () => {
    it('should switch workspace when selecting a different project', () => {
      promptManagement.visit(PROJECT_A);
      promptManagement.findProjectSelector().should('contain', PROJECT_A);

      promptManagement.findProjectSelector().click();
      promptManagement.findProjectInDropdown(PROJECT_B).click();
      promptManagement.shouldHaveWorkspace(PROJECT_B);

      promptManagement.findProjectSelector().click();
      promptManagement.findProjectInDropdown(PROJECT_A).click();
      promptManagement.shouldHaveWorkspace(PROJECT_A);
    });
  });

  describe('Dark mode toggle', () => {
    it('should sync localStorage on toggle', () => {
      promptManagement.visit(PROJECT_A);

      appChrome.findDarkThemeToggle().click();
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'true');

      appChrome.findLightThemeToggle().click();
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'false');
    });
  });

  describe('Error states', () => {
    it('should show error state for invalid workspace', () => {
      const invalidWorkspace = 'nonexistent-project';
      promptManagement.visit(invalidWorkspace);
      promptManagement
        .findErrorEmptyState()
        .should('be.visible')
        .should('contain', invalidWorkspace);
    });

    it('should show unavailable state when MLflow is not configured', () => {
      initIntercepts({ mlflowConfigured: false });
      promptManagement.visit(PROJECT_A);
      promptManagement.findMlflowUnavailableState().should('be.visible');
    });

    it('should hide nav item when genAiStudio feature flag is disabled', () => {
      initIntercepts({ genAiStudio: false });
      cy.visitWithLogin('/');
      promptManagement.findNavItem().should('not.exist');
    });

    it('should hide nav item when MLflow operator is removed', () => {
      const dscStatus = mockDscStatus({});
      dscStatus.components = {
        ...dscStatus.components,
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' },
      };
      cy.interceptOdh('GET /api/dsc/status', dscStatus);

      cy.visitWithLogin('/');
      promptManagement.findNavItem().should('not.exist');
    });
  });
});
