import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
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
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  ConfigMapModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import type { NotebookSize } from '~/types';

const configYamlPath = '../../__mocks__/mock-upload-configmap.yaml';

type HandlersProps = {
  isEmpty?: boolean;
  notebookSizes?: NotebookSize[];
};

const initIntercepts = ({
  isEmpty = false,
  notebookSizes = [
    {
      name: 'Medium',
      resources: {
        limits: {
          cpu: '6',
          memory: '24Gi',
        },
        requests: {
          cpu: '3',
          memory: '24Gi',
        },
      },
    },
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      notebookSizes,
    }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-1',
        displayName: 'Test image 1',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-2',
        displayName: 'Test image 2',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-3',
        displayName: 'Test image 3',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-4',
        displayName: 'Test image 4',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-5',
        displayName: 'Test image 5',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-6',
        displayName: 'Test image 6',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-7',
        displayName: 'Test image 7',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-8',
        displayName: 'Test image 8',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-9',
        displayName: 'Test image 9',
      }),
    ]),
  );
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'aws-connection-db-1' }));
  cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.interceptK8sList(
    {
      model: NotebookModel,
      ns: 'test-project',
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
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

  cy.interceptK8s('POST', ConfigMapModel, mockConfigMap({})).as('createConfigMap');

  cy.interceptK8s('POST', NotebookModel, mockNotebookK8sResource({})).as('createWorkbench');
};
describe('Workbench page', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findEmptyState().should('exist');
    workbenchPage.findCreateButton().should('be.enabled');
  });

  it('Create workbench', () => {
    initIntercepts({
      isEmpty: true,
      notebookSizes: [
        {
          name: 'XSmall',
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
        },
        {
          name: 'Small',
          resources: {
            limits: {
              cpu: '2',
              memory: '8Gi',
            },
            requests: {
              cpu: '1',
              memory: '8Gi',
            },
          },
        },
      ],
    });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.findNameInput().fill('test-project');
    createSpawnerPage.findDescriptionInput().fill('test-description');
    //to check scrollable dropdown selection
    createSpawnerPage.findNotebookImage('test-9').click();
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

  it('Create workbench with numbers', () => {
    initIntercepts({
      isEmpty: true,
      notebookSizes: [
        {
          name: 'XSmall',
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
        },
        {
          name: 'Small',
          resources: {
            limits: {
              cpu: '2',
              memory: '8Gi',
            },
            requests: {
              cpu: '1',
              memory: '8Gi',
            },
          },
        },
      ],
    });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.findNameInput().fill('1234');
    createSpawnerPage.findDescriptionInput().fill('test-description');
    //to check scrollable dropdown selection
    createSpawnerPage.findNotebookImage('test-9').click();
    createSpawnerPage.selectContainerSize(
      'XSmall Limits: 0.5 CPU, 500Mi Memory Requests: 0.1 CPU, 100Mi Memory',
    );
    createSpawnerPage.findSubmitButton().should('be.enabled');

    createSpawnerPage.findSubmitButton().click();

    cy.wait('@createWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          labels: {
            app: 'wb-1234',
            'opendatahub.io/dashboard': 'true',
            'opendatahub.io/odh-managed': 'true',
            'opendatahub.io/user': 'test-2duser',
          },
          annotations: {
            'openshift.io/display-name': '1234',
            'openshift.io/description': 'test-description',
          },
          name: 'wb-1234',
          namespace: 'test-project',
        },
      });
    });
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('list workbench and table sorting', () => {
    initIntercepts({
      notebookSizes: [
        {
          name: 'XSmall',
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
        },
        {
          name: 'Small',
          resources: {
            limits: {
              cpu: '2',
              memory: '8Gi',
            },
            requests: {
              cpu: '1',
              memory: '8Gi',
            },
          },
        },
      ],
    });
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
    cy.interceptK8s(
      NotebookModel,
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
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: false })]));

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

    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('startWorkbench');
    cy.interceptK8s(
      NotebookModel,
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
    initIntercepts({
      notebookSizes: [
        {
          name: 'XSmall',
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
        },
        {
          name: 'Small',
          resources: {
            limits: {
              cpu: '2',
              memory: '8Gi',
            },
            requests: {
              cpu: '1',
              memory: '8Gi',
            },
          },
        },
      ],
    });
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.shouldHaveNotebookImageSelectInput('Test Image');
    editSpawnerPage.shouldHaveContainerSizeInput('Small');
    editSpawnerPage.shouldHavePersistentStorage('Test Storage');
    editSpawnerPage.findSubmitButton().should('be.enabled');
    editSpawnerPage.findNameInput().fill('Updated Notebook');

    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');
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

    // Actual request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@editWorkbench.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
    });
  });

  it('Handle deleted notebook sizes in workbenches table', () => {
    initIntercepts({
      notebookSizes: [
        {
          name: 'XSmall',
          resources: {
            limits: {
              cpu: '0.5',
              memory: '500Mi',
            },
            requests: {
              cpu: '0.1',
              memory: '100Mi',
            },
          },
        },
      ],
    });
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveContainerSize('Custom');
    notebookRow.findKebabAction('Edit workbench').click();
    editSpawnerPage.shouldHaveContainerSizeInput('Keep custom size');
    cy.go('back');
    workbenchPage.findCreateButton().click();
    verifyRelativeURL('/projects/test-project/spawner');
    // Custom container size dropdown option should not be present for create workbench
    createSpawnerPage.findContainerSizeInput('Keep custom size').should('not.exist');
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
    cy.interceptK8s(
      'DELETE',
      { model: NotebookModel, ns: 'test-project', name: 'test-notebook' },
      mock200Status({}),
    ).as('deleteWorkbench');

    cy.interceptK8sList(
      NotebookModel,
      mockK8sResourceList([
        mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
      ]),
    );
    deleteModal.findSubmitButton().click();
    cy.wait('@deleteWorkbench');
  });
});
