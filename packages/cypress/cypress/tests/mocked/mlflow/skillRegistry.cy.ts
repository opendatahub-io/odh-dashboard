import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import {
  interceptMlflowEmbeddedRemoteFailure,
  interceptMlflowStatus,
  interceptMlflowStatusError,
} from '../../../utils/mlflowUtils';
import { skillRegistry } from '../../../pages/skillRegistry';
import { homePage } from '../../../pages/home/home';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({
  projects = [PROJECT_A, PROJECT_B],
  mlflowConfigured = true,
  skillRegistryEnabled = true,
  userSetup = asProductAdminUser,
}: {
  projects?: string[];
  mlflowConfigured?: boolean;
  skillRegistryEnabled?: boolean;
  userSetup?: () => void;
} = {}) => {
  userSetup();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ skillRegistry: skillRegistryEnabled }));
  interceptMlflowStatus(mlflowConfigured);
  interceptMlflowEmbeddedRemoteFailure();

  const projectResources = projects.map((name) =>
    mockProjectK8sResource({ k8sName: name, displayName: name }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList(projectResources));
  if (projectResources.length > 0) {
    cy.interceptK8s(ProjectModel, projectResources[0]);
  }
};

describe('Skills page', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('Page chrome and navigation', () => {
    it('should display page title and a Launch MLflow button that opens Skills in MLflow', () => {
      skillRegistry.visit(PROJECT_A);
      skillRegistry.findPageTitle().should('be.visible').should('contain', 'Skills');
      skillRegistry
        .findPageDescription()
        .should('be.visible')
        .should('contain', 'Discover and register agent skills');
      skillRegistry
        .findLaunchMlflowButton()
        .should('be.visible')
        .should('have.attr', 'href', `/mlflow/#/skills?workspace=${PROJECT_A}`)
        .should('have.attr', 'target', '_blank');
    });

    it('should navigate via the AI hub nav section and show active nav item', () => {
      homePage.visit();

      skillRegistry.findNavItem().should('contain', 'Tech Preview');
      skillRegistry.navigate();

      skillRegistry.shouldHaveSkillRegistryUrl();
      skillRegistry.findNavItem().should('have.attr', 'aria-current', 'page');
    });

    it('should show the nav item and page to a non-admin user', () => {
      initIntercepts({ userSetup: asProjectEditUser });
      homePage.visit();

      skillRegistry.navigate();

      skillRegistry.shouldHaveSkillRegistryUrl();
      skillRegistry.findPageTitle().should('contain', 'Skills');
    });

    it('should hide the nav item when the skillRegistry flag is off', () => {
      initIntercepts({ skillRegistryEnabled: false });
      homePage.visit();

      skillRegistry.findNavItem().should('not.exist');
    });
  });

  describe('Project selector', () => {
    it('should stay on Skills when switching projects', () => {
      skillRegistry.visit(PROJECT_A);
      skillRegistry.projectDropdown.findToggleButton().should('contain', PROJECT_A);

      skillRegistry.projectDropdown.openAndSelectItem(PROJECT_B, true);
      skillRegistry.shouldHaveWorkspace(PROJECT_B);
    });
  });

  describe('Empty and error states', () => {
    it('should show the no-projects empty state when the user has no projects', () => {
      initIntercepts({ projects: [] });
      skillRegistry.visit();
      skillRegistry.findNoProjectsEmptyState().should('be.visible');
    });

    it('should show error state for invalid workspace', () => {
      const invalidWorkspace = 'nonexistent-project';
      skillRegistry.visit(invalidWorkspace);
      skillRegistry.findErrorEmptyState().should('be.visible').should('contain', invalidWorkspace);
    });

    it('should show admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false });
      skillRegistry.visit(PROJECT_A);
      skillRegistry.findNotConfiguredAdminEmptyState().should('be.visible');
      skillRegistry.findNotConfiguredEmptyState().should('not.exist');
      skillRegistry.findMlflowUnavailableState().should('not.exist');
    });

    it('should show non-admin not-configured empty state when MLflow BFF reports unconfigured', () => {
      initIntercepts({ mlflowConfigured: false, userSetup: asProjectEditUser });
      skillRegistry.visit(PROJECT_A);
      skillRegistry.findNotConfiguredEmptyState().should('be.visible');
      skillRegistry.findNotConfiguredAdminLink().should('be.visible');
      skillRegistry.findNotConfiguredAdminEmptyState().should('not.exist');
    });

    it('should show unavailable empty state when MLflow BFF status check fails', () => {
      interceptMlflowStatusError();
      skillRegistry.visit(PROJECT_A);
      cy.wait('@mlflowStatusError');
      skillRegistry.findMlflowUnavailableState().should('be.visible');
      skillRegistry.findNotConfiguredEmptyState().should('not.exist');
    });

    it('should show unavailable empty state when the MLflow remote fails to load', () => {
      skillRegistry.visit(PROJECT_A);
      cy.wait('@mlflowEmbeddedRemoteEntry');
      skillRegistry.findMlflowUnavailableState().should('be.visible');
    });

    it('should hide nav item when MLflow operator is removed', () => {
      const dscStatus = mockDscStatus({});
      dscStatus.components = {
        ...dscStatus.components,
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Removed' },
      };
      cy.interceptOdh('GET /api/dsc/status', dscStatus);

      homePage.visit();
      skillRegistry.findNavItem().should('not.exist');
    });
  });
});
