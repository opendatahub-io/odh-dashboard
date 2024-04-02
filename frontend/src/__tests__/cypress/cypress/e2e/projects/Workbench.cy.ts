import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStatus,
} from '~/__mocks__';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import {
  createSpawnerPage,
  editSpawnerPage,
  notFoundSpawnerPage,
  notebookConfirmModal,
  storageModal,
  workbenchPage,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url.cy';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

const configYamlPath = '../../__mocks__/mock-upload-configmap.yaml';

type HandlersProps = {
  isEmpty?: boolean;
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
      },
    }),
  );
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects' },
    mockK8sResourceList([mockProjectK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project' },
    mockProjectK8sResource({}),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/pods' },
    mockK8sResourceList([mockPodK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/image.openshift.io/v1/namespaces/opendatahub/imagestreams',
    },
    mockK8sResourceList([mockImageStreamK8sResource({})]),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/api/v1/namespaces/test-project/secrets/aws-connection-db-1`,
    },
    mockSecretK8sResource({ name: 'aws-connection-db-1' }),
  );
  cy.intercept(
    {
      method: 'PATCH',
      pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
    },
    mockNotebookK8sResource({}),
  ).as('stopWorkbench');
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    },
    mockRouteK8sResource({ notebookName: 'test-notebook' }),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
    },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockNotebookK8sResource({
              opts: {
                metadata: {
                  name: 'test-notebook',
                  labels: {
                    'opendatahub.io/notebook-image': 'true',
                  },
                  annotations: {
                    'opendatahub.io/image-display-name': 'Test image',
                  },
                },
              },
            }),
            mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
          ],
    ),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets',
    },
    mockK8sResourceList([mockSecretK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims' },
    mockK8sResourceList([mockPVCK8sResource({})]),
  );

  cy.intercept(
    { method: 'POST', pathname: '/api/k8s/api/v1/namespaces/test-project/configmaps' },
    mockConfigMap({}),
  ).as('createConfigMap');

  cy.intercept(
    { method: 'POST', pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks' },
    mockK8sResourceList([mockNotebookK8sResource({})]),
  ).as('createWorkbench');
};
describe('Workbench page', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findEmptyState().should('exist');
    workbenchPage.findCreateButton().should('be.enabled');
  });

  it('Create workbench', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.findNameInput().fill('test-project');
    createSpawnerPage.findDescriptionInput().fill('test-description');
    createSpawnerPage.selectNotebookImage('Test Image Python v3.8');
    createSpawnerPage.selectContainerSize(
      'XSmall Limits: 0.5 CPU, 500Mi Memory Requests: 0.1 CPU, 100Mi Memory',
    );
    createSpawnerPage.findSubmitButton().should('be.enabled');
    createSpawnerPage.findAddVariableButton().click();

    //add Config Map  key/ value environment variable
    let environmentVariableField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    environmentVariableField.selectEnvironmentVariableType('Config Map');
    environmentVariableField.selectEnvDataType('Key / value');

    environmentVariableField.findAnotherKeyValuePairButton().click();
    let keyValuePairField = environmentVariableField.getKeyValuePair(0);
    keyValuePairField.findRemoveKeyValuePairButton().should('be.enabled');
    keyValuePairField.findRemoveKeyValuePairButton().click();
    keyValuePairField.findKeyInput().fill('test-key');
    keyValuePairField.findValueInput().fill('test-value');

    //add environment secret variable
    createSpawnerPage.findAddVariableButton().click();
    environmentVariableField = createSpawnerPage.getEnvironmentVariableTypeField(1);
    environmentVariableField.selectEnvironmentVariableType('Secret');
    environmentVariableField.selectEnvDataType('Key / value');
    keyValuePairField = environmentVariableField.getKeyValuePair(0);
    keyValuePairField.findKeyInput().fill('test-key');
    keyValuePairField.findValueInput().fill('test-value');
    keyValuePairField.findRemoveKeyValuePairButton().should('be.disabled');
    environmentVariableField.findRemoveEnvironmentVariableButton().click();

    // add Config Map  upload environment variable
    createSpawnerPage.findAddVariableButton().click();
    environmentVariableField = createSpawnerPage.getEnvironmentVariableTypeField(1);
    environmentVariableField.selectEnvironmentVariableType('Config Map');
    environmentVariableField.selectEnvDataType('Upload');
    environmentVariableField.uploadConfigYaml(configYamlPath);
    environmentVariableField.findRemoveEnvironmentVariableButton().should('be.enabled');

    //cluster storage
    createSpawnerPage.shouldHaveClusterStorageAlert();

    //add new cluster storage
    createSpawnerPage.findNewStorageRadio().click();
    createSpawnerPage.findClusterStorageInput().should('have.value', 'test-project');
    createSpawnerPage.findClusterStorageDescriptionInput().fill('test-description');
    createSpawnerPage.findPVSizeMinusButton().click();
    createSpawnerPage.findPVSizeInput().should('have.value', '19');
    createSpawnerPage.findPVSizePlusButton().click();
    createSpawnerPage.findPVSizeInput().should('have.value', '20');
    createSpawnerPage.selectPVSize('Mi');

    //add existing cluster storage
    createSpawnerPage.findExistingStorageRadio().click();
    createSpawnerPage.selectExistingPersistentStorage('Test Storage');

    //add data connection
    createSpawnerPage.findDataConnectionCheckbox().check();
    createSpawnerPage.findNewDataConnectionRadio().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    createSpawnerPage.findAwsNameInput().type('Test Secret');
    createSpawnerPage.findAwsKeyInput().type('test-aws-key');
    createSpawnerPage.findAwsSecretKeyInput().type('test-secret-key');
    createSpawnerPage.findEndpointInput().type('https://s3.amazonaws.com/');
    createSpawnerPage.findRegionInput().type('us-east-1');
    createSpawnerPage.findBucketInput().type('test-bucket');

    //add existing data connection
    createSpawnerPage.findExistingDataConnectionRadio().click();
    createSpawnerPage.selectExistingDataConnection('Test Secret');

    createSpawnerPage.findSubmitButton().click();
    cy.wait('@createConfigMap').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          namespace: 'test-project',
        },
        data: { 'test-key': 'test-value' },
      });
    });

    cy.wait('@createWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'test-project',
            'openshift.io/description': 'test-description',
          },
          name: 'test-project',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              volumes: [
                { name: 'test-storage', persistentVolumeClaim: { claimName: 'test-storage' } },
              ],
            },
          },
        },
      });
    });
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('list workbench and table sorting', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveContainerSize('Small');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Running ');
    notebookRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'false');

    //Name sorting
    workbenchPage.findNotebookTableHeaderButton('Name').click();
    workbenchPage.findNotebookTableHeaderButton('Name').should(be.sortAscending);
    workbenchPage.findNotebookTableHeaderButton('Name').click();
    workbenchPage.findNotebookTableHeaderButton('Name').should(be.sortDescending);

    //status sorting
    workbenchPage.findNotebookTableHeaderButton('Status').click();
    workbenchPage.findNotebookTableHeaderButton('Status').should(be.sortAscending);
    workbenchPage.findNotebookTableHeaderButton('Status').click();
    workbenchPage.findNotebookTableHeaderButton('Status').should(be.sortDescending);

    //expandable table
    notebookRow.toggleExpandableContent();
    notebookRow.findAddStorageButton().click();
    storageModal.selectExistingPersistentStorage('Test Storage');
    storageModal.findMountField().fill('data');
    storageModal.findSubmitButton().click();
  });

  it('Validate the notebook status when workbench is stopped and starting', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');

    //stop Workbench
    notebookRow.findEnableSwitch().click();
    notebookConfirmModal.findStopWorkbenchButton().should('be.enabled');
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },
      mockNotebookK8sResource({
        opts: {
          metadata: {
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/api/v1/namespaces/test-project/pods',
      },
      mockK8sResourceList([mockPodK8sResource({ isRunning: false })]),
    );

    notebookConfirmModal.findStopWorkbenchButton().click();
    cy.wait('@stopWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/kubeflow-resource-stopped',
        },
      ]);
    });
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped ');
    notebookRow.findNotebookRouteLink().should('have.attr', 'aria-disabled', 'true');

    cy.intercept(
      {
        method: 'PATCH',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },
      mockNotebookK8sResource({}),
    ).as('startWorkbench');
    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },

      mockNotebookK8sResource({
        opts: {
          metadata: {
            name: 'test-notebook',
            labels: {
              'opendatahub.io/notebook-image': 'true',
            },
            annotations: {
              'opendatahub.io/image-display-name': 'Test image',
            },
          },
        },
      }),
    );

    notebookRow.findEnableSwitch().click();
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Starting... ');
    notebookRow.findHaveNotebookStatusText().click();

    cy.wait('@startWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        { op: 'remove', path: '/metadata/annotations/kubeflow-resource-stopped' },
      ]);
    });
    notebookRow.findNotebookStatusPopover('Waiting for notebook to start...').should('exist');
  });

  it('Edit workbench', () => {
    initIntercepts({});
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.shouldHaveNotebookImageSelectInput('Test Image');
    editSpawnerPage.shouldHaveContainerSizeInput('Small');
    editSpawnerPage.shouldHavePersistentStorage('test-notebook');
    editSpawnerPage.findSubmitButton().should('be.enabled');
    editSpawnerPage.findNameInput().fill('Updated Notebook');

    cy.intercept(
      {
        method: 'PUT',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },
      mockNotebookK8sResource({}),
    ).as('editWorkbench');
    editSpawnerPage.findSubmitButton().click();
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'Updated Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
          },
          name: 'test-notebook',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              volumes: [
                { name: 'test-notebook', persistentVolumeClaim: { claimName: 'test-notebook' } },
              ],
            },
          },
        },
      });
    });

    // Actaul request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@editWorkbench.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actaul request
    });
  });

  it('Validate that updating invalid workbench will navigate to the new page with an error message', () => {
    initIntercepts({});
    notFoundSpawnerPage.visit('updated-notebook');
    notFoundSpawnerPage.shouldHaveErrorMessageTitle('Unable to edit workbench');
    notFoundSpawnerPage.findReturnToPage().should('be.enabled');
    notFoundSpawnerPage.findReturnToPage().click();
    verifyRelativeURL('/projects/test-project?section=overview');
  });

  it('Delete Workbench', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findKebabAction('Delete workbench').click();
    deleteModal.findInput().fill('Test Notebook');
    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },
      { kind: 'Status', apiVersion: 'v1', metadata: {}, status: 'Success' },
    ).as('deleteWorkbench');

    cy.intercept(
      {
        method: 'GET',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
      ]),
    );
    deleteModal.findSubmitButton().click();
    cy.wait('@deleteWorkbench');
  });
});
