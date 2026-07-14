import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowStatus } from '../../../utils/mlflowUtils';
import { promptManagement } from '../../../pages/promptManagement';
import { appChrome } from '../../../pages/appChrome';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';
const GLOBAL_PROJECT = 'global-prompts';

const initIntercepts = ({
  mlflowConfigured = true,
  genAiStudio = true,
  globalMLflowNamespaces = [] as string[],
  globalProjectPrompts = false,
}: {
  mlflowConfigured?: boolean;
  genAiStudio?: boolean;
  globalMLflowNamespaces?: string[];
  globalProjectPrompts?: boolean;
} = {}) => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ genAiStudio, globalMLflowNamespaces, globalProjectPrompts }),
  );
  interceptMlflowStatus(mlflowConfigured);

  const projectA = mockProjectK8sResource({ k8sName: PROJECT_A, displayName: PROJECT_A });
  const projectB = mockProjectK8sResource({ k8sName: PROJECT_B, displayName: PROJECT_B });
  const globalProject = mockProjectK8sResource({
    k8sName: GLOBAL_PROJECT,
    displayName: 'Global Prompts',
  });
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([projectA, projectB, globalProject]));
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

  describe('Global project indicator', () => {
    it('should show indicator when selected project is the global namespace', () => {
      initIntercepts({
        globalProjectPrompts: true,
        globalMLflowNamespaces: [GLOBAL_PROJECT],
      });
      promptManagement.visit(GLOBAL_PROJECT);
      promptManagement.findGlobalProjectIndicator().should('be.visible');
    });

    it('should not show indicator when selected project is not the global namespace', () => {
      initIntercepts({
        globalProjectPrompts: true,
        globalMLflowNamespaces: [GLOBAL_PROJECT],
      });
      promptManagement.visit(PROJECT_A);
      promptManagement.findGlobalProjectIndicator().should('not.exist');
    });

    it('should not show indicator when no global namespace is configured', () => {
      initIntercepts({ globalMLflowNamespaces: [] });
      promptManagement.visit(PROJECT_A);
      promptManagement.findGlobalProjectIndicator().should('not.exist');
    });

    it('should not show indicator when feature flag is disabled even with namespace configured', () => {
      initIntercepts({
        globalProjectPrompts: false,
        globalMLflowNamespaces: [GLOBAL_PROJECT],
      });
      promptManagement.visit(GLOBAL_PROJECT);
      promptManagement.findGlobalProjectIndicator().should('not.exist');
    });
  });

  describe('Pinned namespace in project selector', () => {
    it('should show global project in a separate group in the dropdown', () => {
      initIntercepts({
        globalProjectPrompts: true,
        globalMLflowNamespaces: [GLOBAL_PROJECT],
      });
      promptManagement.visit(PROJECT_A);
      promptManagement.findProjectSelector().click();
      promptManagement.findPinnedGroupLabel().should('be.visible');
      promptManagement.findProjectsGroupLabel().should('be.visible');
      promptManagement.findProjectInDropdown('Global Prompts').should('be.visible');
    });

    it('should not show groups when no global namespace is configured', () => {
      initIntercepts({ globalMLflowNamespaces: [] });
      promptManagement.visit(PROJECT_A);
      promptManagement.findProjectSelector().click();
      promptManagement.findPinnedGroupLabel().should('not.exist');
      promptManagement.findProjectsGroupLabel().should('not.exist');
    });

    it('should not show groups when feature flag is disabled even with namespace configured', () => {
      initIntercepts({
        globalProjectPrompts: false,
        globalMLflowNamespaces: [GLOBAL_PROJECT],
      });
      promptManagement.visit(PROJECT_A);
      promptManagement.findProjectSelector().click();
      promptManagement.findPinnedGroupLabel().should('not.exist');
      promptManagement.findProjectsGroupLabel().should('not.exist');
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

    it('should show admin not-configured empty state when MLflow is not configured', () => {
      initIntercepts({ mlflowConfigured: false });
      promptManagement.visit(PROJECT_A);
      promptManagement.findNotConfiguredAdminEmptyState().should('be.visible');
      promptManagement.findNotConfiguredEmptyState().should('not.exist');
      promptManagement.findMlflowUnavailableState().should('not.exist');
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
