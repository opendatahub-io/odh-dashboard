import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { interceptMlflowEmbeddedRemoteFailure } from '../../../utils/mlflowUtils';
import { mcpRegistry } from '../../../pages/mcpRegistry';

const PROJECT_A = 'test-project-a';
const PROJECT_B = 'test-project-b';

const initIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ mcpCatalog: true, mcpRegistry: true, disableModelRegistry: false }),
  );

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
        [DataScienceStackComponent.MLFLOW]: { managementState: 'Managed' },
      },
    }),
  );

  const projectA = mockProjectK8sResource({ k8sName: PROJECT_A, displayName: PROJECT_A });
  const projectB = mockProjectK8sResource({ k8sName: PROJECT_B, displayName: PROJECT_B });
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([projectA, projectB]));
  cy.interceptK8s(ProjectModel, projectA);
};

describe('MCP Registry tab wrapper', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should redirect to the first project when no workspace is selected', () => {
    interceptMlflowEmbeddedRemoteFailure();
    cy.visitWithLogin('/ai-hub/mcp-servers/registry');
    mcpRegistry.shouldHaveWorkspace(PROJECT_A);
  });

  it('should switch workspace when selecting a different project', () => {
    interceptMlflowEmbeddedRemoteFailure();
    mcpRegistry.visit(PROJECT_A);
    mcpRegistry.findProjectSelector().should('contain', PROJECT_A);

    mcpRegistry.findProjectSelector().click();
    mcpRegistry.findProjectInDropdown(PROJECT_B).click();
    mcpRegistry.shouldHaveWorkspace(PROJECT_B);
  });

  it('should show unavailable empty state when the MLflow remote fails to load', () => {
    interceptMlflowEmbeddedRemoteFailure();
    mcpRegistry.visit(PROJECT_A);

    cy.wait('@mlflowEmbeddedRemoteEntry');
    mcpRegistry.findMlflowUnavailableState().should('be.visible');
  });
});
