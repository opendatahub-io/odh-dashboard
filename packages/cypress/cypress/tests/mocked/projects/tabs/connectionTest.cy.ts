import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { ConnectionTypeFieldType } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { projectDetails } from '../../../../pages/projects';
import { ProjectModel, SecretModel } from '../../../../utils/models';
import { connectionsPage, addConnectionModal } from '../../../../pages/connections';

const testConnectionType = mockConnectionTypeConfigMap({
  name: 'test-type',
  displayName: 'Test Connection Type',
  fields: [
    {
      name: 'Hostname',
      type: ConnectionTypeFieldType.ShortText,
      envVar: 'HOST',
      required: true,
      properties: {},
    },
    {
      name: 'API Key',
      type: ConnectionTypeFieldType.Hidden,
      envVar: 'API_KEY',
      required: true,
      properties: {},
    },
  ],
});

const initIntercepts = () => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableConnectionTypes: false,
      connectionTest: true,
    }),
  );
  cy.interceptOdh('GET /api/connection-types', [testConnectionType]);
};

describe('Test Connection - Modal', () => {
  beforeEach(() => {
    initIntercepts();
    cy.interceptK8sList({ model: SecretModel, ns: 'test-project' }, mockK8sResourceList([]));
  });

  it('should show Not tested status and Test connection button in create modal', () => {
    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findTestStatusNotTested().should('exist');
    addConnectionModal.findTestConnectionButton().should('exist');
  });

  it('should disable Test connection button when no connection type is selected', () => {
    cy.interceptOdh('GET /api/connection-types', [
      testConnectionType,
      mockConnectionTypeConfigMap({
        name: 'another-type',
        displayName: 'Another Type',
        fields: [
          {
            name: 'URL',
            type: ConnectionTypeFieldType.ShortText,
            envVar: 'URL',
            required: false,
            properties: {},
          },
        ],
      }),
    ]);

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findTestConnectionButton().should('be.disabled');
  });

  it('should show success alert and Verified label after successful test', () => {
    cy.intercept('POST', '/core-bff/api/v1/connections/test', {
      body: { data: { success: true, message: 'Connection is reachable' } },
    }).as('testConnection');

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findConnectionNameInput().fill('my-connection');
    addConnectionModal.find().findByTestId('field HOST').fill('localhost');
    addConnectionModal.find().findByTestId('field API_KEY').fill('secret-key');

    addConnectionModal.findTestConnectionButton().click();
    cy.wait('@testConnection');

    addConnectionModal.findTestSuccessAlert().should('exist');
    addConnectionModal.findTestStatusVerified().should('exist');
  });

  it('should show failure alert and Failed label after failed test', () => {
    cy.intercept('POST', '/core-bff/api/v1/connections/test', {
      body: {
        data: { success: false, error: 'CONNECTION_FAILED', message: 'Unable to connect to host' },
      },
    }).as('testConnection');

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findConnectionNameInput().fill('my-connection');
    addConnectionModal.find().findByTestId('field HOST').fill('badhost');
    addConnectionModal.find().findByTestId('field API_KEY').fill('secret-key');

    addConnectionModal.findTestConnectionButton().click();
    cy.wait('@testConnection');

    addConnectionModal.findTestFailureAlert().should('exist');
    addConnectionModal.findTestStatusFailed().should('exist');
  });

  it('should reset status to Not tested when a credential field changes', () => {
    cy.intercept('POST', '/core-bff/api/v1/connections/test', {
      body: { data: { success: true, message: 'Connection is reachable' } },
    }).as('testConnection');

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findConnectionNameInput().fill('my-connection');
    addConnectionModal.find().findByTestId('field HOST').fill('localhost');
    addConnectionModal.find().findByTestId('field API_KEY').fill('secret-key');

    addConnectionModal.findTestConnectionButton().click();
    cy.wait('@testConnection');
    addConnectionModal.findTestStatusVerified().should('exist');

    addConnectionModal.find().findByTestId('field HOST').clear().fill('new-host');
    addConnectionModal.findTestStatusNotTested().should('exist');
    addConnectionModal.findTestSuccessAlert().should('not.exist');
  });

  it('should not reset status when connection name changes', () => {
    cy.intercept('POST', '/core-bff/api/v1/connections/test', {
      body: { data: { success: true, message: 'Connection is reachable' } },
    }).as('testConnection');

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findConnectionNameInput().fill('my-connection');
    addConnectionModal.find().findByTestId('field HOST').fill('localhost');
    addConnectionModal.find().findByTestId('field API_KEY').fill('secret-key');

    addConnectionModal.findTestConnectionButton().click();
    cy.wait('@testConnection');
    addConnectionModal.findTestStatusVerified().should('exist');

    addConnectionModal.findConnectionNameInput().clear().fill('renamed-connection');
    addConnectionModal.findTestStatusVerified().should('exist');
  });

  it('should not block Create button after test failure', () => {
    cy.intercept('POST', '/core-bff/api/v1/connections/test', {
      body: {
        data: { success: false, error: 'CONNECTION_FAILED', message: 'Unable to connect' },
      },
    }).as('testConnection');

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.findCreateConnectionButton().click();
    addConnectionModal.findConnectionNameInput().fill('my-connection');
    addConnectionModal.find().findByTestId('field HOST').fill('localhost');
    addConnectionModal.find().findByTestId('field API_KEY').fill('secret-key');

    addConnectionModal.findTestConnectionButton().click();
    cy.wait('@testConnection');
    addConnectionModal.findTestStatusFailed().should('exist');

    addConnectionModal.findCreateButton().should('be.enabled');
  });
});

// CONVERTED to Jest: ConnectionTestStatusLabel.spec.tsx

describe('Test Connection - Table', () => {
  it('should show Test connection in the kebab menu', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([mockSecretK8sResource({ name: 'conn-1', displayName: 'Connection 1' })]),
    );

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.getConnectionRow('Connection 1').findKebab().click();
    cy.findByTestId('test-connection-action').should('exist');
  });

  it('should have connection name as a clickable link', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([mockSecretK8sResource({ name: 'conn-1', displayName: 'Connection 1' })]),
    );

    projectDetails.visitSection('test-project', 'connections');
    connectionsPage.getConnectionRow('Connection 1').findConnectionNameLink().should('exist');
  });
});
