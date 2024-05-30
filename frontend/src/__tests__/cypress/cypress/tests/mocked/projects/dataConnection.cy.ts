import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import {
  addDataConnectionModal,
  editDataConnectionModal,
} from '~/__tests__/cypress/cypress/pages/dataConnection';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';

type HandlersProps = {
  isEmpty?: boolean;
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
      },
    }),
  );
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
  );
  cy.interceptK8s(
    'PATCH',
    {
      model: NotebookModel,
      ns: 'test-project',
      name: 'test-notebook',
    },
    [],
  );
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8sList(
    NotebookModel,
    mockK8sResourceList([mockNotebookK8sResource({ envFromName: '' })]),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );
  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));
  cy.interceptK8sList(
    {
      model: SecretModel,
      ns: 'test-project',
    },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockSecretK8sResource({ s3Bucket: 'c2RzZA==' }),
            mockSecretK8sResource({ name: 'test1', displayName: 'test1' }),
          ],
    ),
  );
  cy.interceptK8s(
    'POST',
    {
      model: SecretModel,
      ns: 'test-project',
    },
    mockSecretK8sResource({}),
  ).as('createDataConnection');
};

describe('Data connections', () => {
  it('Empty state when no data connections are available', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection('test-project', 'data-connections');
    projectDetails.shouldBeEmptyState('Data connections', 'data-connections', true);
    projectDetails.findAddDataConnectionButton().should('be.enabled');
  });

  it('Add data connections', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection('test-project', 'data-connections');
    projectDetails.findAddDataConnectionButton().should('be.enabled');
    projectDetails.findAddDataConnectionButton().click();

    addDataConnectionModal.findNameInput().type('Test Secret');
    addDataConnectionModal.findAwsKeyInput().type('test-aws-key');
    addDataConnectionModal.findAwsSecretKeyInput().type('test-secret-key');
    addDataConnectionModal.findEndpointInput().type('https://s3.amazonaws.com/');
    addDataConnectionModal.findSubmitButton().should('be.enabled');
    addDataConnectionModal.findRegionInput().type('us-east-1');
    addDataConnectionModal.findBucketInput().type('test-bucket');

    cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})])).as(
      'refreshSecrets',
    );

    addDataConnectionModal.findSubmitButton().click();

    cy.wait('@createDataConnection').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'aws-connection-test-secret',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'Test Secret',
            'opendatahub.io/connection-type': 's3',
          },
          labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
        },
        stringData: {
          AWS_ACCESS_KEY_ID: 'test-aws-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
          AWS_S3_BUCKET: 'test-bucket',
          AWS_S3_ENDPOINT: 'https://s3.amazonaws.com/',
          AWS_DEFAULT_REGION: 'us-east-1',
        },
      });
    });

    //Actual request
    cy.wait('@createDataConnection').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createDataConnection.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });

    cy.wait('@refreshSecrets').then(() => {
      projectDetails.shouldBeEmptyState('Data connections', 'data-connections', false);
    });
  });

  it('Edit data connection', () => {
    initIntercepts({});
    projectDetails.visitSection('test-project', 'data-connections');
    projectDetails.shouldBeEmptyState('Data connections', 'data-connections', false);
    const dataConnectionRow = projectDetails.getDataConnectionRow('Test Secret');
    dataConnectionRow.findWorkbenchConnection().contains('No connections');
    dataConnectionRow.findKebabAction('Edit data connection').click();

    editDataConnectionModal.findNameInput().should('have.value', 'Test Secret');
    editDataConnectionModal.findAwsKeyInput().should('have.value', 'sdsd');
    editDataConnectionModal.findAwsSecretKeyInput().should('have.value', 'sdsd');
    editDataConnectionModal.findEndpointInput().should('have.value', 'https://s3.amazonaws.com/');
    editDataConnectionModal.findRegionInput().should('have.value', 'us-east-1');
    editDataConnectionModal.findBucketInput().should('have.value', 'sdsd');
    editDataConnectionModal.findNameInput().fill('Updated test');
    editDataConnectionModal
      .findWorkbenchConnectionSelect()
      .findSelectOption('Test Notebook')
      .click();
    editDataConnectionModal.findNotebookRestartAlert().should('exist');
    cy.interceptK8sList(
      NotebookModel,
      mockK8sResourceList([mockNotebookK8sResource({ envFromName: 'test-secret' })]),
    ).as('addConnectedWorkbench');
    cy.interceptK8s('PUT', SecretModel, mockSecretK8sResource({})).as('editDataConnection');

    editDataConnectionModal.findSubmitButton().click();
    cy.wait('@editDataConnection').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'test-secret',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'Updated test',
            'opendatahub.io/connection-type': 's3',
          },
          labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
        },
        stringData: {
          AWS_ACCESS_KEY_ID: 'sdsd',
          AWS_SECRET_ACCESS_KEY: 'sdsd',
          AWS_S3_ENDPOINT: 'https://s3.amazonaws.com/',
          AWS_DEFAULT_REGION: 'us-east-1',
          AWS_S3_BUCKET: 'sdsd',
        },
      });
    });

    //Actual request
    cy.wait('@editDataConnection').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@editDataConnection.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });

    cy.wait('@addConnectedWorkbench').then(() => {
      projectDetails
        .getDataConnectionRow('Test Secret')
        .findWorkbenchConnection()
        .should('have.text', 'Test Notebook');
    });
  });
  it('Delete connection', () => {
    initIntercepts({});
    projectDetails.visitSection('test-project', 'data-connections');
    const dataConnectionRow = projectDetails.getDataConnectionRow('Test Secret');
    dataConnectionRow.findKebabAction('Delete data connection').click();
    deleteModal.findInput().type('Test Secret');
    cy.interceptK8s(
      'DELETE',
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'test-secret',
      },
      mock200Status({}),
    ).as('deleteDataConnection');

    deleteModal.findSubmitButton().click();
    cy.wait('@deleteDataConnection');
  });

  it('Sort by Name', () => {
    initIntercepts({});
    projectDetails.visitSection('test-project', 'data-connections');
    projectDetails.findSortButton('Name').click();
    projectDetails.findSortButton('Name').should(be.sortAscending);
    projectDetails.findSortButton('Name').click();
    projectDetails.findSortButton('Name').should(be.sortDescending);
  });
});
