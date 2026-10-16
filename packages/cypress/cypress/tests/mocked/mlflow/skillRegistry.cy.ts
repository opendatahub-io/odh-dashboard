import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowEmbeddedRemoteFailure } from '../../../utils/mlflowUtils';
import { skillRegistry } from '../../../pages/skillRegistry';
import { pageNotfound } from '../../../pages/pageNotFound';
import { navSidebar } from '../navSidebar/navSidebar';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = ({
  skillRegistryEnabled = true,
  mlflowState = 'Managed',
  projects = [PROJECT_A, PROJECT_B],
}: {
  skillRegistryEnabled?: boolean;
  mlflowState?: 'Managed' | 'Removed';
  projects?: string[];
} = {}) => {
  asProductAdminUser();

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ skillRegistry: skillRegistryEnabled }));

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MLFLOW]: { managementState: mlflowState },
      },
    }),
  );

  const projectResources = projects.map((name) =>
    mockProjectK8sResource({ k8sName: name, displayName: name }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList(projectResources));
  if (projectResources.length > 0) {
    cy.interceptK8s(ProjectModel, projectResources[0]);
  }
};

describe('Skill Registry feature flag', () => {
  it('should show the Skills nav item with a Tech Preview label when the flag is enabled', () => {
    initIntercepts();
    navSidebar.visit();
    navSidebar
      .findNavItem({ name: 'Skills', rootSection: 'AI hub' })
      .should('exist')
      .and('contain.text', 'Tech Preview');
  });

  it('should not show the Skills nav item when the flag is disabled', () => {
    initIntercepts({ skillRegistryEnabled: false });
    navSidebar.visit();
    navSidebar.findNavItem({ name: 'Skills', rootSection: 'AI hub' }).should('not.exist');
  });

  it('should not show the Skills nav item when MLflow is not installed', () => {
    initIntercepts({ mlflowState: 'Removed' });
    navSidebar.visit();
    navSidebar.findNavItem({ name: 'Skills', rootSection: 'AI hub' }).should('not.exist');
  });

  it('should show 404 page when navigating to Skills with the flag disabled', () => {
    initIntercepts({ skillRegistryEnabled: false });
    cy.visitWithLogin('/ai-hub/skills/registry');
    pageNotfound.findPage().should('exist');
  });
});

describe('Skill Registry tab wrapper', () => {
  it('should open the registry tab and redirect to the first project when no workspace is selected', () => {
    initIntercepts();
    interceptMlflowEmbeddedRemoteFailure();
    cy.visitWithLogin('/ai-hub/skills');
    cy.location('pathname').should('eq', '/ai-hub/skills/registry');
    skillRegistry.shouldHaveWorkspace(PROJECT_A);
    skillRegistry.findPageTitle().should('have.text', 'Skills');
  });

  it('should switch workspace when selecting a different project', () => {
    initIntercepts();
    interceptMlflowEmbeddedRemoteFailure();
    skillRegistry.visit(PROJECT_A);
    skillRegistry.findProjectSelector().should('contain', PROJECT_A);

    skillRegistry.findProjectSelector().click();
    skillRegistry.findProjectInDropdown(PROJECT_B).click();
    skillRegistry.shouldHaveWorkspace(PROJECT_B);
  });

  it('should show the no-projects empty state when there are no projects', () => {
    initIntercepts({ projects: [] });
    skillRegistry.visit();
    skillRegistry.findNoProjectsEmptyState().should('be.visible');
  });

  it('should show unavailable empty state when the MLflow remote fails to load', () => {
    initIntercepts();
    interceptMlflowEmbeddedRemoteFailure();
    skillRegistry.visit(PROJECT_A);

    cy.wait('@mlflowEmbeddedRemoteEntry');
    skillRegistry.findMlflowUnavailableState().should('be.visible');
  });

  it('should keep the requested skill and version when a detail URL has no workspace', () => {
    initIntercepts();
    interceptMlflowEmbeddedRemoteFailure();
    cy.visitWithLogin('/ai-hub/skills/registry/@acme/pdf-extract?version=2');

    cy.location('pathname').should('eq', '/ai-hub/skills/registry/@acme/pdf-extract');
    cy.location('search').should('include', 'version=2');
    skillRegistry.shouldHaveWorkspace(PROJECT_A);
    skillRegistry.findMlflowUnavailableState().should('be.visible');
  });
});
