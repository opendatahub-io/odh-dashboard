import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '~/__mocks__';
import { mockConnectionTypeConfigMap } from '~/__mocks__/mockConnectionType';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { ProjectModel, SecretModel } from '~/__tests__/cypress/cypress/utils/models';

const initIntercepts = (isEmpty = false) => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );
  cy.interceptK8sList(
    {
      model: SecretModel,
      ns: 'test-project',
    },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockSecretK8sResource({ name: 'test1', displayName: 'test1' }),
            mockSecretK8sResource({
              name: 'test2',
              displayName: 'test2',
              connectionType: 'postgres',
            }),
          ],
    ),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableConnectionTypes: false,
    }),
  );
  cy.interceptOdh('GET /api/connection-types', [mockConnectionTypeConfigMap({})]);
};

describe('Connections', () => {
  it('Empty state when no data connections are available', () => {
    initIntercepts(true);
    projectDetails.visitSection('test-project', 'connections');
    projectDetails.shouldBeEmptyState('Connections', 'connections', true);
  });

  it('List connections', () => {
    initIntercepts();
    projectDetails.visitSection('test-project', 'connections');
    projectDetails.shouldBeEmptyState('Connections', 'connections', false);
    cy.findByTestId('connection-table').findByText('test1').should('exist');
    cy.findByTestId('connection-table').findByText('s3').should('exist');
    cy.findByTestId('connection-table').findByText('test2').should('exist');
    cy.findByTestId('connection-table').findByText('postgres').should('exist');
  });
});
