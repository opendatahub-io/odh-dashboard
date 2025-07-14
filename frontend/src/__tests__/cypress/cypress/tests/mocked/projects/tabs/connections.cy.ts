import {
  mock200Status,
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '#~/__mocks__';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '#~/__mocks__/mockConnectionType';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { ProjectModel, SecretModel } from '#~/__tests__/cypress/cypress/utils/models';
import { connectionsPage } from '#~/__tests__/cypress/cypress/pages/connections';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { ConnectionTypeFieldType } from '#~/concepts/connectionTypes/types';

const initIntercepts = ({ isEmpty = false }) => {
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
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection('test-project', 'connections');
    projectDetails.shouldBeEmptyState('Connections', 'connections', true);
  });

  it('List connections', () => {
    initIntercepts({});
    projectDetails.visitSection('test-project', 'connections');
    projectDetails.shouldBeEmptyState('Connections', 'connections', false);
    const row1 = connectionsPage.getConnectionRow('test1');
    row1.find().findByText('test1').should('exist');
    row1.find().findByText('s3').should('exist');
    row1.find().findByText('S3 compatible object storage').should('exist');
    const row2 = connectionsPage.getConnectionRow('test2');
    row2.find().findByText('test2').should('exist');
    row2.find().findByText('postgres').should('exist');
    row2.find().findByText('S3 compatible object storage').should('not.exist');
  });

  it('Delete a connection', () => {
    initIntercepts({});
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
    initIntercepts({});
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

    cy.wait('@createConnection').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          annotations: {
            'opendatahub.io/connection-type-ref': 'test',
            'openshift.io/description': '',
            'openshift.io/display-name': 'new connection',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
          name: 'new-connection',
          namespace: 'test-project',
        },
        stringData: {},
      });
    });
  });

  it('Add a connection with whitespace to trim', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        name: 's3',
        fields: mockModelServingFields,
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
    cy.findByTestId('connection-name-desc-name').fill('whitespace connection');
    cy.findByTestId(['field', 'AWS_ACCESS_KEY_ID']).fill('    testtesttest123123      ');
    cy.findByTestId(['field', 'AWS_SECRET_ACCESS_KEY']).fill('    testtesttest123123      ');
    cy.findByTestId(['field', 'AWS_S3_ENDPOINT']).fill('    https://s3.amazonaws.com/      ');
    cy.findByTestId(['field', 'AWS_S3_BUCKET']).fill('    test-bucket      ');
    cy.findByTestId(['field', 'AWS_S3_BUCKET']).blur();
    cy.findByTestId('modal-submit-button').click();

    cy.wait('@createConnection').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'whitespace-connection',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
          annotations: {
            'openshift.io/display-name': 'whitespace connection',
            'openshift.io/description': '',
            'opendatahub.io/connection-type': 's3',
            'opendatahub.io/connection-type-ref': 's3',
          },
        },
        stringData: {
          /* eslint-disable camelcase */
          AWS_ACCESS_KEY_ID: 'testtesttest123123',
          AWS_SECRET_ACCESS_KEY: 'testtesttest123123',
          AWS_S3_ENDPOINT: 'https://s3.amazonaws.com/',
          AWS_S3_BUCKET: 'test-bucket',
          /* eslint-enable camelcase */
        },
      });
    });
  });

  it('Edit a connection', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        name: 'postgres',
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
      'PUT',
      SecretModel,
      mockSecretK8sResource({
        name: 'test2',
      }),
    ).as('editConnection');

    projectDetails.visitSection('test-project', 'connections');

    connectionsPage.getConnectionRow('test2').findKebabAction('Edit').click();
    cy.findByTestId(['field', 'field_env']).fill('new data');
    cy.findByTestId('modal-submit-button').click();

    cy.wait('@editConnection').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          annotations: {
            'opendatahub.io/connection-type': 's3',
            'opendatahub.io/connection-type-ref': 'postgres',
            'openshift.io/description': '',
            'openshift.io/display-name': 'test2',
          },
          labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
          name: 'test2',
          namespace: 'test-project',
        },
        stringData: {
          /* eslint-disable camelcase */
          AWS_ACCESS_KEY_ID: 'sdsd',
          AWS_SECRET_ACCESS_KEY: 'sdsd',
          AWS_S3_ENDPOINT: 'https://s3.amazonaws.com/',
          AWS_DEFAULT_REGION: 'us-east-1',
          AWS_S3_BUCKET: 'test-bucket',
          field_env: 'new data',
          /* eslint-enable camelcase */
        },
      });
    });
  });

  it('Create an OCI connection', () => {
    initIntercepts({});
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        name: 'oci-v1',
        displayName: 'OCI compliant registry - v1',
        fields: [
          {
            name: 'Access type',
            type: ConnectionTypeFieldType.Dropdown,
            envVar: 'ACCESS_TYPE',
            required: false,
            properties: {
              variant: 'multi',
              items: [
                { label: 'Push secret', value: 'Push' },
                { label: 'Pull secret', value: 'Pull' },
              ],
            },
          },
          {
            name: 'Secret details',
            type: ConnectionTypeFieldType.File,
            envVar: '.dockerconfigjson',
            required: true,
            properties: { extensions: ['.dockerconfigjson, .json'] },
          },
          {
            name: 'Base URL / Registry URI',
            type: ConnectionTypeFieldType.ShortText,
            envVar: 'OCI_HOST',
            required: true,
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
    cy.findByTestId('connection-name-desc-name').fill('new oci connection');
    cy.findByTestId(['field', 'OCI_HOST']).fill('quay.io/myorg');
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('{"auths":{"quay.io":{"token":"asdf"}}}}'),
        fileName: '.dockerconfigjson',
      },
      { force: true, action: 'drag-drop' },
    );
    cy.findByTestId('modal-submit-button').click();

    cy.wait('@createConnection').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'new-oci-connection',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'new oci connection',
            'openshift.io/description': '',
            'opendatahub.io/connection-type-ref': 'oci-v1',
          },
        },
        stringData: {
          OCI_HOST: 'quay.io/myorg',
          '.dockerconfigjson': '{"auths":{"quay.io":{"token":"asdf"}}}}',
        },
        type: 'kubernetes.io/dockerconfigjson',
      });
    });
  });
});
