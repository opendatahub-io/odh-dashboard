import {
  mock200Status,
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '~/__mocks__';
import { mockConnectionTypeConfigMap } from '~/__mocks__/mockConnectionType';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { ProjectModel, SecretModel } from '~/__tests__/cypress/cypress/utils/models';
import { connectionsPage } from '~/__tests__/cypress/cypress/pages/connections';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';

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
    const row1 = connectionsPage.getConnectionRow('test1');
    row1.find().findByText('test1').should('exist');
    row1.find().findByText('s3').should('exist');
    row1.find().findByText('Model serving').should('exist');
    const row2 = connectionsPage.getConnectionRow('test2');
    row2.find().findByText('test2').should('exist');
    row2.find().findByText('postgres').should('exist');
    row1.find().findByText('Model serving').should('exist');
  });

  it('Delete a connection', () => {
    initIntercepts();
    cy.interceptK8s(
      'DELETE',
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'test1',
      },
      mock200Status({}),
    ).as('deleteConnection');

    projectDetails.visitSection('test-project', 'connections');

    connectionsPage.getConnectionRow('test1').findKebabAction('Delete').click();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findInput().fill('test1');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteConnection');
  });

  it('Add a connection', () => {
    initIntercepts();
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        name: 'test',
        fields: [
          {
            name: 'field A',
            type: ConnectionTypeFieldType.ShortText,
            envVar: 'field_env',
            properties: {},
          },
        ],
      }),
    ]);
    cy.interceptK8s(
      'POST',
      {
        model: SecretModel,
        ns: 'test-project',
      },
      mockSecretK8sResource({}),
    ).as('createConnection');

    projectDetails.visitSection('test-project', 'connections');

    connectionsPage.findAddConnectionButton().click();
    cy.findByTestId('connection-name-desc-name').fill('new connection');
    cy.findByTestId('modal-submit-button').click();

    cy.wait('@createConnection');
  });
});
