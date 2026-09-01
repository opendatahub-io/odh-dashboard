import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { SpawnerPageSectionID } from '@odh-dashboard/internal/pages/projects/screens/spawner/types';
import { initIntercepts } from './workbenchTestUtils';
import { ImageStreamModel, PVCModel, SecretModel } from '../../../../utils/models';
import { verifyRelativeURL } from '../../../../utils/url';
import {
  attachConnectionModal,
  createSpawnerPage,
  workbenchPage,
} from '../../../../pages/workbench';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection.ts';

const configYamlPath = './cypress/fixtures/resources/yaml/mock-upload-configmap.yaml';

describe('Workbench page', () => {
  it('Empty state', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findEmptyState().should('exist');
    workbenchPage.findCreateButton().should('not.have.attr', 'aria-disabled', 'true');
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

  it('Create workbench form shows character limit helper text and warnings', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    verifyRelativeURL('/projects/test-project/spawner');

    createSpawnerPage.getNameInput().should('be.visible');
    createSpawnerPage.getDescriptionInput().should('be.visible');

    // Name field approaching limit (exactly 241 characters), same pattern as BYON image form
    const longWorkbenchName =
      'Data--Science-Workbench-Image-v2..0-with-Python-3.9-TensorFlow-2.8-PyTorch-1.11-Scikit-learn-1.0-Pandas-1.4-NumPy-1.22-Jupyter-Lab-3.4-CUDA-11.6-for-Machine-Learning-and-Deep-Learning-Development-Environment-Extended-Build-2024-03-Latest-End';

    createSpawnerPage.getNameInput().clear();
    createSpawnerPage.getNameInput().type(longWorkbenchName, { delay: 0 });
    createSpawnerPage.getNameInput().should('have.value', longWorkbenchName);
    cy.contains('Cannot exceed 250 characters (9 remaining)').should('be.visible');

    // Description field approaching limit (exactly 5252 characters)
    const repeatingPart = 'A'.repeat(52);
    const longDescription = repeatingPart.repeat(101);

    createSpawnerPage.getDescriptionInput().clear();
    createSpawnerPage.getDescriptionInput().type(longDescription, { delay: 0 });
    createSpawnerPage.getDescriptionInput().should('have.value', longDescription);
    cy.contains('Cannot exceed 5500 characters (248 remaining)').should('be.visible');
  });

  it('should allow selecting environment variable type via accessible dropdown', () => {
    initIntercepts({ isEmpty: true });
    workbenchPage.visit('test-project');
    workbenchPage.findCreateButton().click();
    createSpawnerPage.findSideBarItems(SpawnerPageSectionID.ENVIRONMENT_VARIABLES).click();
    createSpawnerPage.findAddVariableButton().click();

    const environmentVariableField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    environmentVariableField.selectEnvironmentVariableType('ConfigMap');
    environmentVariableField.find().findByTestId('env-type-radio-Config Map').should('be.checked');
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
    environmentVariableField.selectEnvironmentVariableType('ConfigMap');
    environmentVariableField.selectEnvDataType('Create');

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
    environmentVariableField.selectEnvDataType('Create');
    keyValuePairField = environmentVariableField.getKeyValuePair(0);
    keyValuePairField.findKeyInput().fill('test-key');
    keyValuePairField.findValueInput().fill('test-value');
    keyValuePairField.findRemoveKeyValuePairButton().should('be.disabled');
    environmentVariableField.findRemoveEnvironmentVariableButton().click();

    // add Config Map  upload environment variable
    createSpawnerPage.findAddVariableButton().click();
    environmentVariableField = createSpawnerPage.getEnvironmentVariableTypeField(1);
    environmentVariableField.selectEnvironmentVariableType('ConfigMap');
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
      .findByRole('menuitem', { name: /^Project-scoped test image/, hidden: true })
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
      .findByRole('menuitem', { name: /^Test Image/, hidden: true })
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
          },
          annotations: {
            'openshift.io/display-name': '1234',
            'openshift.io/description': 'test-description',
            'opendatahub.io/user': 'test-2duser',
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
    attachConnectionModal.clickAttachButton();

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
});
