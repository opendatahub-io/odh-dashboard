import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import {
  interceptMlflowEmbeddedRemoteFailure,
  interceptMlflowStatus,
  interceptMlflowStatusError,
} from '../../../utils/mlflowUtils';
import { mlflowExperiments } from '../../../pages/mlflowExperiments';
import { appChrome } from '../../../pages/appChrome';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({
  mlflowConfigured = true,
  userSetup = asProductAdminUser,
}: {
  mlflowConfigured?: boolean;
  userSetup?: () => void;
} = {}) => {
  userSetup();
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

    it('should show admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false });
      mlflowExperiments.visit(PROJECT_A);
      mlflowExperiments.findNotConfiguredAdminEmptyState().should('be.visible');
      mlflowExperiments.findNotConfiguredEmptyState().should('not.exist');
      mlflowExperiments.findNotConfiguredAdminLink().should('not.exist');
      mlflowExperiments.findMlflowUnavailableState().should('not.exist');
    });

    it('should show non-admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false, userSetup: asProjectEditUser });
      mlflowExperiments.visit(PROJECT_A);
      mlflowExperiments.findNotConfiguredEmptyState().should('be.visible');
      mlflowExperiments.findNotConfiguredAdminLink().should('be.visible');
      mlflowExperiments.findNotConfiguredAdminEmptyState().should('not.exist');
      mlflowExperiments.findMlflowUnavailableState().should('not.exist');
    });

    it('should show unavailable empty state when MLflow BFF status check fails', () => {
      interceptMlflowStatusError();
      mlflowExperiments.visit(PROJECT_A);
      cy.wait('@mlflowStatusError');
      mlflowExperiments.findMlflowUnavailableState().should('be.visible');
      mlflowExperiments.findNotConfiguredEmptyState().should('not.exist');
      mlflowExperiments.findNotConfiguredAdminLink().should('not.exist');
    });

    it('should show service-unavailable empty state when MLflow remote fails to load', () => {
      initIntercepts({ mlflowConfigured: true });
      interceptMlflowEmbeddedRemoteFailure();
      mlflowExperiments.visit(PROJECT_A);
      cy.wait('@mlflowEmbeddedRemoteEntry');
      mlflowExperiments.findMlflowUnavailableState().should('be.visible');
      mlflowExperiments.findNotConfiguredEmptyState().should('not.exist');
      mlflowExperiments.findNotConfiguredAdminLink().should('not.exist');
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
