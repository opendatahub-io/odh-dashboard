import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '#~/__mocks__';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import {
  attachConnectionModal,
  createSpawnerPage,
  editSpawnerPage,
  notFoundSpawnerPage,
  notebookConfirmModal,
  notebookImageUpdateModal,
  workbenchPage,
  attachExistingStorageModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  ConfigMapModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockConnectionTypeConfigMap } from '#~/__mocks__/mockConnectionType';
import type { HardwareProfileKind, NotebookKind, PodKind } from '#~/k8sTypes';
import type { EnvironmentFromVariable } from '#~/pages/projects/types';
import { SpawnerPageSectionID } from '#~/pages/projects/screens/spawner/types';
import { AccessMode } from '#~/pages/storageClasses/storageEnums.ts';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection.ts';

const configYamlPath = '../../__mocks__/mock-upload-configmap.yaml';

type HandlersProps = {
  isEmpty?: boolean;
  mockPodList?: PodKind[];
  envFrom?: EnvironmentFromVariable[];
  disableProjectScoped?: boolean;
  notebooks?: NotebookKind[];
  hardwareProfiles?: {
    global: HardwareProfileKind[];
    project: HardwareProfileKind[];
  };
  pvcSize?: string;
};

const initIntercepts = ({
  isEmpty = false,
  envFrom,
  mockPodList = [mockPodK8sResource({})],
  disableProjectScoped = true,
  notebooks = [
    mockNotebookK8sResource({
      lastImageSelection: 'test-imagestream:1.2',
      envFrom,
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
    mockNotebookK8sResource({
      name: 'outdated-notebook',
      displayName: 'Outdated Notebook',
      image: 'test-10:2023.1',
      lastImageSelection: 'test-10:2023.1',
      envFrom,
      opts: {
        metadata: {
          name: 'outdated-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'opendatahub.io/image-display-name': 'Outdated image',
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '1234',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'latest-notebook',
      displayName: 'Latest Notebook',
      image: 'test-10:2024.2',
      lastImageSelection: 'test-10:2024.2',
      envFrom,
      opts: {
        metadata: {
          name: 'latest-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'opendatahub.io/image-display-name': 'Latest image',
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '12345',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'mismatch-commit-notebook',
      displayName: 'Deprecated Notebook',
      image: 'test-10:2023.1',
      lastImageSelection: 'test-10:2023.1',
      envFrom,
      opts: {
        metadata: {
          name: 'mismatch-commit-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
          annotations: {
            'notebooks.opendatahub.io/last-image-version-git-commit-selection': '123',
            'opendatahub.io/image-display-name': 'Outdated image',
          },
        },
      },
    }),
    mockNotebookK8sResource({
      name: 'mismatch-commit-byon-notebook',
      displayName: 'BYON Notebook',
      image: 'test-6:2024.2',
      lastImageSelection: 'test-6:2024.2',
      envFrom,
      opts: {
        metadata: {
          name: 'mismatch-commit-byon-notebook',
          labels: {
            'opendatahub.io/notebook-image': 'true',
          },
        },
      },
    }),
  ],
  hardwareProfiles,
  pvcSize,
}: HandlersProps) => {
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableProjectScoped,
      pvcSize,
    }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList(mockPodList));
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
        opts: {
          metadata: {
            name: 'test-6',
            labels: {
              'component.opendatahub.io/name': 'notebooks',
              'opendatahub.io/component': 'true',
              'opendatahub.io/notebook-image': 'true',
              'app.kubernetes.io/created-by': 'byon',
            },
          },
          spec: {
            tags: [
              {
                name: '2024.2',
                annotations: {
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
            ],
          },
          status: {
            dockerImageRepository:
              'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
            tags: [
              {
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
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
        opts: {
          spec: {
            tags: [
              {
                name: '2023.1',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'false',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '1234',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
              {
                name: '2024.2',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'true',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '12345',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
            ],
          },
          status: {
            dockerImageRepository:
              'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
            tags: [
              {
                tag: '2023.1',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
              {
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-9',
        displayName: 'Test image 9',
      }),
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-10',
        displayName: 'Test image 10',
        opts: {
          spec: {
            tags: [
              {
                name: '2023.1',
                annotations: {
                  'opendatahub.io/image-tag-outdated': 'true',
                  'opendatahub.io/workbench-image-recommended': 'false',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '1234',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
              {
                name: '2024.2',
                annotations: {
                  'opendatahub.io/workbench-image-recommended': 'true',
                  'opendatahub.io/notebook-python-dependencies':
                    '[{"name":"JupyterLab","version": "3.2"}, {"name": "Notebook","version": "6.4"}]',
                  'opendatahub.io/notebook-software': '[{"name":"Python","version":"v3.8"}]',
                  'opendatahub.io/notebook-build-commit': '12345',
                },
                from: {
                  kind: 'DockerImage',
                  name: 'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                },
              },
            ],
          },
          status: {
            dockerImageRepository:
              'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
            tags: [
              {
                tag: '2023.1',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
              {
                tag: '2024.2',
                items: [
                  {
                    created: '2023-06-30T15:07:36Z',
                    dockerImageReference:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    image:
                      'quay.io/opendatahub/notebooks@sha256:a138838e1c9acd7708462e420bf939e03296b97e9cf6c0aa0fd9a5d20361ab75',
                    generation: 2,
                  },
                ],
              },
            ],
          },
        },
      }),
      mockImageStreamK8sResource({
        name: 'test-10stream',
        namespace: 'test-project',
        tagName: '1.22',
        displayName: 'Project-scoped test image',
      }),
    ]),
  );
  cy.interceptK8s(
    { model: SecretModel, ns: 'test-project', name: 'secret' },
    mockCustomSecretK8sResource({
      name: 'secret',
      namespace: 'test-project',
      data: { test: 'c2RzZA==' },
    }),
  );
  cy.interceptK8s(
    'PUT',
    { model: SecretModel, ns: 'test-project', name: 'secret' },
    mockCustomSecretK8sResource({
      name: 'secret',
      namespace: 'test-project',
      data: { test: 'c2RzZA==' },
    }),
  );
  cy.interceptK8s(SecretModel, mockSecretK8sResource({ name: 'aws-connection-db-1' }));
  cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('stopWorkbench');
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.interceptK8sList(
    {
      model: NotebookModel,
      ns: 'test-project',
    },
    mockK8sResourceList(isEmpty ? [] : notebooks),
  );
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-storage-1' })]),
  );

  cy.interceptK8s('POST', ConfigMapModel, mockConfigMap({})).as('createConfigMap');

  cy.interceptK8s('POST', NotebookModel, mockNotebookK8sResource({})).as('createWorkbench');

  if (hardwareProfiles) {
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(hardwareProfiles.global),
    ).as('globalHardwareProfiles');

    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'test-project' },
      mockK8sResourceList(hardwareProfiles.project),
    ).as('projectHardwareProfiles');
  } else {
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    ).as('globalHardwareProfiles');

    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'test-project' },
      mockK8sResourceList(mockProjectScopedHardwareProfiles),
    ).as('projectHardwareProfiles');
  }
};

describe('Workbench page', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findEmptyState().should('exist');
    workbenchPage.findCreateButton().should('be.enabled');
  });

  it('Cancel button', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    //cancel button should work
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findCancelButton().click();
    verifyRelativeURL('/projects/test-project?section=workbenches');

    //cancel button should work after clicking on sidebar items
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.NAME_DESCRIPTION).click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.WORKBENCH_IMAGE).click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.DEPLOYMENT_SIZE).click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.ENVIRONMENT_VARIABLES).click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.CLUSTER_STORAGE).click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.CONNECTIONS).click();
    createSpawnerPage.findCancelButton().click();
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('Create workbench', () => {
    initIntercepts({
      isEmpty: true,
      pvcSize: '8Gi',
    });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('test-project');
    createSpawnerPage.k8sNameDescription.findDescriptionInput().fill('test-description');
    //to check scrollable dropdown selection
    createSpawnerPage.findNotebookImageSelector().should('contain.text', 'Select one');
    createSpawnerPage.findNotebookImage('test-8').click();
    createSpawnerPage.findNotebookImageVersionSelector().click();
    cy.findByTestId('workbench-image-version-dropdown').should('be.visible');
    const notebookImageVersionDropdown = createSpawnerPage.findNotebookImageDropdown();
    notebookImageVersionDropdown.findNotebookImageLabel().should('be.visible');
    notebookImageVersionDropdown
      .findImageVersionButton(
        '2024.2 (12345) Latest Software: Python v3.8 Build date: 6/30/2023, 3:07:36 PM UTC',
      )
      .click();
    hardwareProfileSection.findSelect().should('exist').click();
    hardwareProfileSection.selectProfileContaining('Small Profile');
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

    // cluster storage
    const storageTableRow = createSpawnerPage.getStorageTable().getRowById(0);
    storageTableRow.findNameValue().should('have.text', 'test-project-storage');
    storageTableRow.findStorageSizeValue().should('have.text', 'Max 8GiB');
    storageTableRow.findMountPathValue().should('have.text', '/opt/app-root/src/');

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
            'opendatahub.io/hardware-profile-name': 'small-profile',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
          name: 'test-project',
          namespace: 'test-project',
        },
      });
    });
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('Display and select project-scoped and global-scoped notebook images while creating', () => {
    initIntercepts({
      disableProjectScoped: false,
      isEmpty: true,
    });
    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'test-10',
          displayName: 'Project-scoped test image',
        }),
      ]),
    );
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('test-project');
    createSpawnerPage.k8sNameDescription.findDescriptionInput().fill('test-description');

    // Verify both groups are initially visible
    createSpawnerPage.findNotebookImageSearchSelector().should('contain.text', 'Select one');
    createSpawnerPage.findNotebookImageSearchSelector().click();
    cy.contains('Project-scoped images').should('be.visible');
    cy.contains('Global-scoped images').should('be.visible');

    // Search for a value that exists in Global images but not in Project-scoped images
    createSpawnerPage.findNotebookImageSearchInput().should('be.visible').type('9');

    // Wait for and verify the groups are visible
    cy.contains('Test image 9').should('be.visible');
    createSpawnerPage.getProjectScopedImagesLabel().should('not.exist');

    // Search for a value that doesn't exist in either Global images or Project-scoped images
    createSpawnerPage.findNotebookImageSearchInput().should('be.visible').clear().type('sample');

    // Wait for and verify that no results are found
    cy.contains('No results found').should('be.visible');
    createSpawnerPage.getGlobalImagesLabel().should('not.exist');
    createSpawnerPage.getProjectScopedImagesLabel().should('not.exist');
    createSpawnerPage.findNotebookImageSearchInput().should('be.visible').clear();

    // Check for project specific serving runtimes
    const projectScopedNotebookImage = createSpawnerPage.getProjectScopedNotebookImages();
    projectScopedNotebookImage
      .find()
      .findByRole('menuitem', { name: 'Project-scoped test image', hidden: true })
      .click();
    createSpawnerPage.findProjectScopedLabel().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist').click();
    hardwareProfileSection.selectProjectScopedProfile(/Large Profile-1/);
    createSpawnerPage.findSubmitButton().should('be.enabled');

    // Check for global specific serving runtimes
    createSpawnerPage.findNotebookImageSearchSelector().click();
    const globalScopedNotebookImage = createSpawnerPage.getGlobalScopedNotebookImages();
    globalScopedNotebookImage
      .find()
      .findByRole('menuitem', { name: 'Test Image', hidden: true })
      .click();
    createSpawnerPage.findGlobalScopedLabel().should('exist');
  });

  it('Display project-scoped hardware profile selection', () => {
    initIntercepts({
      disableProjectScoped: false,
    });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist').click();

    // verify available project-scoped hardware profile
    hardwareProfileSection.selectProjectScopedProfile(/Small Profile/);
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    hardwareProfileSection.selectProjectScopedProfile(/Large Profile-1/);

    // verify available global-scoped hardware profile
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    hardwareProfileSection.selectGlobalScopedProfile(/Small Profile/);
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    hardwareProfileSection.selectGlobalScopedProfile(/Large Profile/);
  });

  it('Should show correct message when no hardware profiles available', () => {
    initIntercepts({
      disableProjectScoped: false,
      hardwareProfiles: {
        global: [],
        project: [],
      },
    });

    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');

    // Verify hardware profile section exists
    hardwareProfileSection.findSelect().should('exist');
    hardwareProfileSection.findSelect().should('be.disabled');

    // verify no hardware profiles
    hardwareProfileSection
      .findSelect()
      .should(
        'contain.text',
        'No enabled or valid hardware profiles are available. Contact your administrator.',
      );
  });

  it('Create workbench with numbers', () => {
    initIntercepts({
      isEmpty: true,
    });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('1234');
    createSpawnerPage.k8sNameDescription.findDescriptionInput().fill('test-description');
    //to check scrollable dropdown selection
    createSpawnerPage.findNotebookImage('test-9').click();
    hardwareProfileSection.findSelect().should('exist').click();
    hardwareProfileSection.selectProfileContaining('Small Profile');
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
            'opendatahub.io/hardware-profile-name': 'small-profile',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
          name: 'wb-1234',
          namespace: 'test-project',
        },
      });
    });
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('Cannot create workbench without a connection', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableConnectionTypes: false }));
    cy.interceptOdh('GET /api/connection-types', []);
    cy.interceptK8sList({ model: SecretModel, ns: 'test-project' }, mockK8sResourceList([]));

    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();

    createSpawnerPage.findAttachConnectionButton().should('have.attr', 'aria-disabled', 'true');
    createSpawnerPage.findSubmitButton().should('be.disabled');
  });

  it('Cannot create workbench without a storage', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableConnectionTypes: false }));
    cy.interceptK8sList({ model: PVCModel, ns: 'test-project' }, mockK8sResourceList([]));

    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();

    createSpawnerPage
      .findAttachExistingStorageButton()
      .should('have.attr', 'aria-disabled', 'true');
    createSpawnerPage.findSubmitButton().should('be.disabled');
  });

  it('Create workbench with connection', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableConnectionTypes: false }));
    cy.interceptOdh('GET /api/connection-types', [mockConnectionTypeConfigMap({})]);
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockSecretK8sResource({ name: 'test1', displayName: 'test1' }),
        mockSecretK8sResource({ name: 'test2', displayName: 'test2' }),
      ]),
    );

    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSubmitButton().should('be.disabled');
    verifyRelativeURL('/projects/test-project/spawner');
    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('1234');
    createSpawnerPage.findNotebookImage('test-9').click();

    createSpawnerPage.findAttachConnectionButton().click();
    attachConnectionModal.shouldBeOpen();
    attachConnectionModal.findAttachButton().should('be.disabled');
    attachConnectionModal.selectConnectionOption('test1');
    attachConnectionModal.findAttachButton().should('be.enabled');
    attachConnectionModal.selectConnectionOption('test2');
    attachConnectionModal.findAttachButton().click();

    createSpawnerPage.findConnectionsTableRow('test1', 's3');
    createSpawnerPage.findConnectionsTableRow('test2', 's3');

    createSpawnerPage.findSubmitButton().click();
    cy.wait('@createWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': '1234',
            'opendatahub.io/connections': 'test-project/test1,test-project/test2',
          },
          name: 'wb-1234',
          namespace: 'test-project',
        },
      });
    });
    verifyRelativeURL('/projects/test-project?section=workbenches');
  });

  it('Update Notebook Image', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'outdated-notebook', displayName: 'Outdated Notebook' }),
      ]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'outdated-notebook' }));
    cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({ isRunning: true })]));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Outdated Notebook').findNotebookImageLabel().click();
    notebookImageUpdateModal.findUpdateImageButton().click();
    notebookImageUpdateModal.findSubmitUpdateImageButton().should('be.disabled');
    notebookImageUpdateModal.findLatestVersionOption().click();

    cy.interceptK8s('PATCH', NotebookModel, {
      delay: 500, //TODO: Remove the delay when we add support for loading states
      body: mockNotebookK8sResource({
        name: 'outdated-notebook',
        displayName: 'Outdated Notebook (updated)',
      }),
    }).as('updateNotebookImage');

    cy.interceptK8s(
      'GET',
      NotebookModel,
      mockNotebookK8sResource({
        name: 'outdated-notebook',
        displayName: 'Outdated Notebook',
      }),
    );
    notebookImageUpdateModal.findSubmitUpdateImageButton().click();
    workbenchPage.findUpdatingImageIcon().should('be.visible');
    cy.wait('@updateNotebookImage');
  });

  it('Shows latest image label', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'latest-notebook' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'latest-notebook' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Latest Notebook').findNotebookImageLabel().click();
    cy.contains('Latest image version');
  });

  it('Shows popover with version details', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'latest-notebook' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'latest-notebook' }));
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Latest Notebook');
    notebookRow.findNotebookImageVersionLink().click();
    const popover = notebookRow.findNotebookImageVersionPopover();
    popover.findImageVersionName().contains('Version: 2024.2');
    popover.findImageVersionBuildCommit().contains('Build Commit: 12345');
    popover.findImageVersionBuildDate().contains('Build Date: 6/30/2023, 3:07:36 PM UTC');
    popover.findImageVersionSoftware().contains('Software: Python v3.8');
  });

  it('Shows deprecated image label for commit mismatch', () => {
    initIntercepts({});
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'mismatch-commit-notebook' }),
        mockPVCK8sResource({ name: 'mismatch-commit-byon-notebook' }),
      ]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'mismatch-commit-notebook' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('BYON Notebook').findNotebookImageLabel().should('not.exist');
    workbenchPage.getNotebookRow('Deprecated Notebook').findNotebookImageLabel().click();
    cy.contains('Notebook image deprecated');
  });

  it('Shows deleted image label when last image selection tag is missing', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          name: 'deleted-image-popover',
          displayName: 'Deleted Image Popover',
          image: 'nonexistent-image:0.0',
          lastImageSelection: 'nonexistent-image:0.0',
          opts: {
            metadata: {
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Deleted image',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'deleted-image-popover' })]),
    );
    cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'deleted-image-popover' }));
    workbenchPage.visit('test-project');
    workbenchPage.getNotebookRow('Deleted Image Popover').findNotebookImageLabel().click();
    cy.contains('Notebook image deleted');
  });

  it('Display project-scoped label for a notebook in workbenches table', () => {
    initIntercepts({
      disableProjectScoped: false,
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          workbenchImageNamespace: 'test-project',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'small-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
    });

    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({
          namespace: 'test-project',
        }),
      ]),
    );
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'small-profile',
      },
      mockGlobalScopedHardwareProfiles[0],
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.find().findByText('Test Image').should('exist');
    notebookRow.findProjectScopedLabel().should('exist');
    notebookRow.shouldHaveHardwareProfile('Small');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Running');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');
  });

  it('list workbench and table sorting', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'small-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'small-profile',
      },
      mockGlobalScopedHardwareProfiles[0],
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveHardwareProfile('Small');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Running');
    notebookRow.findNotebookRouteLink().should('not.have.attr', 'aria-disabled');

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
  });

  it('Validate the notebook status when workbench is stopped and starting', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');

    //stop Workbench
    notebookRow.findNotebookStopToggle().click();
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
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
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

    notebookRow.findNotebookStopToggle().click();
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Starting');
    notebookRow.findHaveNotebookStatusText().click();

    cy.wait('@startWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        { op: 'remove', path: '/metadata/annotations/kubeflow-resource-stopped' },
      ]);
    });

    notebookRow.findNotebookStatusModal().should('exist');
  });

  it('Should stop a running workbench with a deleted hardware profile', () => {
    initIntercepts({});
    cy.interceptK8s(
      { model: HardwareProfileModel, ns: 'opendatahub', name: 'deleted-gpu-profile' },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'test-notebook',
          displayName: 'Test Notebook',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/hardware-profile-name': 'deleted-gpu-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
                'opendatahub.io/hardware-profile-resource-version': '12345',
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );

    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');

    notebookRow.findNotebookStopToggle().click();
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
              'kubeflow-resource-stopped': '2024-11-06T10:00:00Z',
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
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
      });
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
      });
    });

    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
  });

  it('Should start a stopped workbench with a deleted hardware profile', () => {
    initIntercepts({ mockPodList: [] });

    cy.interceptK8s(
      { model: HardwareProfileModel, ns: 'opendatahub', name: 'deleted-gpu-profile' },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'test-notebook',
          displayName: 'Test Notebook',
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'kubeflow-resource-stopped': '2024-11-06T10:00:00Z',
                'opendatahub.io/hardware-profile-name': 'deleted-gpu-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
                'opendatahub.io/hardware-profile-resource-version': '12345',
                'opendatahub.io/image-display-name': 'Test image',
              },
            },
          },
        }),
      ]),
    );

    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findHardwareProfileColumn().should('contain', 'Deleted');

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

    notebookRow.findNotebookStopToggle().click();
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Starting');

    cy.wait('@startWorkbench').then((interception) => {
      expect(interception.request.body).to.containSubset([
        { op: 'remove', path: '/metadata/annotations/kubeflow-resource-stopped' },
      ]);
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
      });
      expect(interception.request.body).to.deep.include({
        op: 'remove',
        path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
      });
    });
  });

  it('Validate the start button is enabled when the notebook image is deleted', () => {
    initIntercepts({ mockPodList: [] });

    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          name: 'deleted-image-notebook',
          opts: {
            metadata: {
              annotations: {
                'kubeflow-resource-stopped': '2023-02-14T21:45:14Z',
              },
            },
          },
          displayName: 'Notebook with deleted image',
          image: 'test-imagestream:invalid',
        }),
      ]),
    );

    workbenchPage.visit('test-project');

    const notebookRow = workbenchPage.getNotebookRow('Notebook with deleted image');
    notebookRow.findNotebookImageAvailability().should('have.text', 'Deleted');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Stopped');
    notebookRow.findNotebookStopToggle().should('not.be.disabled');
  });

  it('Edit workbench', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '4', memory: '8Gi' },
            limits: { cpu: '4', memory: '8Gi' },
          },
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'large-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'large-profile',
      },
      mockGlobalScopedHardwareProfiles[1],
    );
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('not.exist');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.shouldHaveNotebookImageSelectInput('Test Image');
    hardwareProfileSection.findSelect().should('contain.text', 'Large Profile');
    editSpawnerPage
      .getStorageTable()
      .getRowById(0)
      .findNameValue()
      .should('have.text', 'Test Storage');
    editSpawnerPage.findSubmitButton().should('be.enabled');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('Updated Notebook');

    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');

    editSpawnerPage.findSubmitButton().click();

    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'Updated Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
            'opendatahub.io/hardware-profile-name': 'large-profile',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
          name: 'test-notebook',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [
                    {
                      secretRef: {
                        name: 'secret',
                      },
                    },
                  ],

                  name: 'test-notebook',
                },
              ],
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
  });

  it('Edit workbench with project-scoped images', () => {
    initIntercepts({
      disableProjectScoped: false,
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '1', memory: '2Gi' },
            limits: { cpu: '1', memory: '2Gi' },
          },
          opts: {
            metadata: {
              name: 'test-notebook',
              namespace: 'test-project',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'small-profile',
                'opendatahub.io/hardware-profile-namespace': 'test-project',
              },
            },
          },
        }),
      ],
    });

    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'test-project',
        name: 'small-profile',
      },
      mockProjectScopedHardwareProfiles[0],
    );

    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'project scoped test image',
          displayName: 'Project scoped test image',
          namespace: 'test-project',
        }),
      ]),
    );
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
    );

    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('not.exist');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('Updated Notebook');

    // update notebook image
    editSpawnerPage
      .findNotebookImageSearchSelector()
      .should('have.text', 'Test ImageGlobal-scoped');
    editSpawnerPage.findNotebookImageSearchSelector().click();

    // Search for a value that exists in Global images but not in Project-scoped images
    editSpawnerPage.findNotebookImageSearchInput().should('be.visible').type('Project');
    editSpawnerPage.findNotebookImageSearchInput().clear();

    const projectScopedNotebookImage = editSpawnerPage.getProjectScopedNotebookImages();
    projectScopedNotebookImage
      .find()
      .findByRole('menuitem', { name: 'Project scoped test image', hidden: true })
      .click();

    cy.findAllByTestId('project-scoped-label').should('have.length', 2);

    hardwareProfileSection
      .findHardwareProfileSearchSelector()
      .should('contain.text', 'Small Profile');

    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');

    editSpawnerPage.findSubmitButton().click();

    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'Updated Notebook',
            'opendatahub.io/image-display-name': 'Project scoped test image',
            'opendatahub.io/workbench-image-namespace': 'test-project',
            'opendatahub.io/hardware-profile-name': 'small-profile',
            'opendatahub.io/hardware-profile-namespace': 'test-project',
          },
          name: 'test-notebook',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [
                    {
                      secretRef: {
                        name: 'secret',
                      },
                    },
                  ],

                  name: 'test-notebook',
                },
              ],
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
  });

  it('Edit workbench when either configMap or secret variables not present', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-1',
          },
        },
        {
          secretRef: {
            name: 'secret-2',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-1',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-2',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('exist');
    editSpawnerPage.findAlertMessage().contains('secret-1 and secret-2');
    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');
    editSpawnerPage.findSubmitButton().click();
    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': 'Test Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [],

                  name: 'test-notebook',
                },
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
  });

  it('Edit workbench when both configMap and secret are deleted', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-1',
          },
        },
        {
          configMapRef: {
            name: 'secret-2',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-1',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'test-project',
        name: 'secret-2',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('exist');
    editSpawnerPage.findAlertMessage().contains('secret-1 secret');
    editSpawnerPage.findAlertMessage().contains('secret-2 config map');
    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');
    editSpawnerPage.findSubmitButton().click();
    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': 'Test Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [],

                  name: 'test-notebook',
                },
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
  });

  it('Handle custom hardware profile resources in workbenches table', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '3', memory: '6Gi' },
            limits: { cpu: '3', memory: '6Gi' },
          },
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
      ],
    });
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.shouldHaveNotebookImageName('Test Image');
    notebookRow.shouldHaveHardwareProfile('Custom');
    notebookRow.findKebabAction('Edit workbench').click();

    hardwareProfileSection.findSelect().should('contain.text', 'Use existing settings');
    cy.go('back');
    workbenchPage.findCreateButton().click();
    verifyRelativeURL('/projects/test-project/spawner');
    hardwareProfileSection.findSelect().click();
    cy.findByRole('option', { name: /Use existing settings/ }).should('not.exist');
  });

  it('Validate that updating invalid workbench will navigate to the new page with an error message', () => {
    initIntercepts({});
    notFoundSpawnerPage.visit('updated-notebook');
    notFoundSpawnerPage.shouldHaveErrorMessageTitle('Unable to edit workbench');
    notFoundSpawnerPage.findReturnToPage().should('be.enabled');
    notFoundSpawnerPage.findReturnToPage().click();
    verifyRelativeURL('/projects/test-project');
  });

  it('Expanded workbench table row', () => {
    initIntercepts({});
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findExpansionButton().click();
    notebookRow.findExpansion().should('be.visible');
    notebookRow.shouldHaveClusterStorageTitle();
    notebookRow.shouldHaveMountPath('/opt/app-root/src/root');
  });

  it('Delete Workbench', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-123456',
          },
        },
        {
          secretRef: {
            name: 'custom-secret',
          },
        },
        {
          configMapRef: {
            name: 'configmap-123456',
          },
        },
        {
          configMapRef: {
            name: 'custom-configmap',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-123456',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'test-project',
        name: 'configmap-123456',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findKebabAction('Delete workbench').click();
    deleteModal.findInput().fill('Test Notebook');
    cy.interceptK8s(
      'DELETE',
      { model: NotebookModel, ns: 'test-project', name: 'test-notebook' },
      mock200Status({}),
    ).as('deleteWorkbench');

    cy.interceptK8s(
      'DELETE',
      { model: SecretModel, ns: 'test-project', name: 'secret-123456' },
      mock200Status({}),
    ).as('deleteSecret1');
    cy.interceptK8s(
      'DELETE',
      { model: ConfigMapModel, ns: 'test-project', name: 'configmap-123456' },
      mock200Status({}),
    ).as('deleteSecret2');

    // Intercept any DELETE requests for resources that should not be deleted
    cy.interceptK8s(
      'DELETE',
      { model: ConfigMapModel, ns: 'test-project', name: 'custom-configmap' },
      cy.spy().as('deleteCustomConfigMap'),
    );
    cy.interceptK8s(
      'DELETE',
      { model: SecretModel, ns: 'test-project', name: 'custom-secret' },
      cy.spy().as('deleteCustomSecret'),
    );

    cy.interceptK8sList(
      NotebookModel,
      mockK8sResourceList([
        mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
      ]),
    );
    deleteModal.findSubmitButton().click();
    cy.wait('@deleteWorkbench');
    cy.wait('@deleteSecret1');
    cy.wait('@deleteSecret2');

    // Verify custom resources were not deleted
    cy.get('@deleteCustomSecret').should('not.have.been.called');
    cy.get('@deleteCustomConfigMap').should('not.have.been.called');
  });

  describe('Attach existing storage', () => {
    it('should correctly display grouped PVCs by access mode and update on selection', () => {
      initIntercepts({
        isEmpty: true,
      });

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([
          mockPVCK8sResource({
            name: 'pvc-rwo',
            displayName: 'pvc-rwo',
            accessModes: [AccessMode.RWO],
            storage: '10Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rwx',
            displayName: 'pvc-rwx',
            accessModes: [AccessMode.RWX],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rox',
            displayName: 'pvc-rox',
            accessModes: [AccessMode.ROX],
            storage: '1Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rwop',
            displayName: 'pvc-rwop',
            accessModes: [AccessMode.RWOP],
            storage: '2Gi',
          }),
        ]),
      );

      workbenchPage.visit('test-project');
      workbenchPage.findCreateButton().click();

      createSpawnerPage.findAttachExistingStorageButton().click();
      attachExistingStorageModal.findExistingStorageField().findByRole('button').click();

      attachExistingStorageModal.findTypeaheadGroup('readwriteonce-rwo-storage').should('exist');
      attachExistingStorageModal.findTypeaheadGroup('readwritemany-rwx-storage').should('exist');
      attachExistingStorageModal.findTypeaheadGroup('readonlymany-rox-storage').should('exist');
      attachExistingStorageModal
        .findTypeaheadGroup('readwriteoncepod-rwop-storage')
        .should('exist');

      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwriteonce-rwo-storage', 'pvc-rwo')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwritemany-rwx-storage', 'pvc-rwx')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readonlymany-rox-storage', 'pvc-rox')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwriteoncepod-rwop-storage', 'pvc-rwop')
        .should('exist');

      attachExistingStorageModal.selectExistingPersistentStorage('pvc-rwx');
      attachExistingStorageModal.verifyPSDropdownText('pvc-rwx');
    });

    it('should not include PVCs that are already attached', () => {
      initIntercepts({
        isEmpty: true,
      });

      const attachedPvcName = 'already-attached-pvc';
      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([
          mockPVCK8sResource({
            name: attachedPvcName,
            displayName: attachedPvcName,
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'new-pvc',
            displayName: 'new-pvc',
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'new-pvc-1',
            displayName: 'new-pvc-1',
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
        ]),
      );

      workbenchPage.visit('test-project');
      workbenchPage.findCreateButton().click();
      createSpawnerPage.findAttachExistingStorageButton().click();

      attachExistingStorageModal.selectExistingPersistentStorage('already-attached-pvc');
      attachExistingStorageModal.findStandardPathInput().clear().type('mnt/different-path');
      attachExistingStorageModal.findAttachButton().click();

      createSpawnerPage.findAttachExistingStorageButton().click();
      attachExistingStorageModal
        .findExistingStorageField()
        .findByRole('button')
        .should('not.be.disabled')
        .click();

      cy.findAllByRole('option').should('not.contain.text', attachedPvcName);
      cy.findAllByRole('option').should('contain.text', 'new-pvc');
      cy.findAllByRole('option').should('contain.text', 'new-pvc-1');
    });
  });
});
