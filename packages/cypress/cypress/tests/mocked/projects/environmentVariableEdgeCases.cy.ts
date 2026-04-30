import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockCustomSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { mockConfigMap } from '@odh-dashboard/internal/__mocks__/mockConfigMap';
import { mockRouteK8sResource } from '@odh-dashboard/internal/__mocks__/mockRouteK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
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
} from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { editSpawnerPage, workbenchPage, workbenchActions } from '../../../pages/workbench';

describe('Environment Variable Edge Cases - RHOAIENG-18214/17122', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({ name: 'test-image', displayName: 'Test image' }),
      ]),
    );
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    );
    cy.interceptK8sList(StorageClassModel, mockStorageClassList());
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-project-storage' })]),
    );
  });

  describe('Pre-existing Environment Variables (RHOAIENG-18214)', () => {
    const setupNotebookWithEnvVars = () => {
      const notebookMock = mockNotebookK8sResource({
        name: 'test-notebook',
        displayName: 'Test Notebook',
        envFrom: [
          { configMapRef: { name: 'env-configmap-1' } },
          { secretRef: { name: 'env-secret-1' } },
          { configMapRef: { name: 'env-configmap-2' } },
        ],
      });

      cy.interceptK8sList(NotebookModel, mockK8sResourceList([notebookMock]));
      cy.interceptK8s(NotebookModel, notebookMock);
      cy.interceptK8sList(
        PodModel,
        mockK8sResourceList([mockPodK8sResource({ name: 'test-notebook' })]),
      );
      cy.interceptK8sList(
        RouteModel,
        mockK8sResourceList([mockRouteK8sResource({ name: 'test-notebook' })]),
      );

      cy.interceptK8s(
        { model: ConfigMapModel, ns: 'test-project', name: 'env-configmap-1' },
        mockConfigMap({ name: 'env-configmap-1', data: { VAR1: 'value1' } }),
      );
      cy.interceptK8s(
        { model: SecretModel, ns: 'test-project', name: 'env-secret-1' },
        mockCustomSecretK8sResource({
          name: 'env-secret-1',
          namespace: 'test-project',
          data: { SECRET_VAR: 'c2VjcmV0LXZhbHVl' },
        }),
      );
      cy.interceptK8s(
        { model: ConfigMapModel, ns: 'test-project', name: 'env-configmap-2' },
        mockConfigMap({ name: 'env-configmap-2', data: { VAR3: 'value3' } }),
      );
    };

    it('should display all 3 pre-existing env variables and handle progressive removal', () => {
      setupNotebookWithEnvVars();

      workbenchPage.visit('test-project');
      workbenchPage.findNotebookTable().should('exist');
      const row = workbenchPage.getNotebookRow('Test Notebook');
      row.findKebab().click();
      workbenchActions.findEditWorkbenchAction().click();

      // Verify exactly 3 pre-existing env variables are displayed
      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 3);
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .find()
        .scrollIntoView()
        .should('be.visible');
      editSpawnerPage
        .getEnvironmentVariableTypeField(1)
        .find()
        .scrollIntoView()
        .should('be.visible');
      editSpawnerPage
        .getEnvironmentVariableTypeField(2)
        .find()
        .scrollIntoView()
        .should('be.visible');

      // Remove first — should leave 2 remaining
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .findRemoveEnvironmentVariableButton()
        .click();

      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 2);
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .find()
        .scrollIntoView()
        .should('be.visible');
      editSpawnerPage
        .getEnvironmentVariableTypeField(1)
        .find()
        .scrollIntoView()
        .should('be.visible');

      // Remove another — last env variable should survive
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .findRemoveEnvironmentVariableButton()
        .click();

      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 1);
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .find()
        .scrollIntoView()
        .should('be.visible');
    });
  });

  describe('Form Add/Remove Behavior', () => {
    it('should add, remove, and re-add env variables without breaking the form', () => {
      const notebookMock = mockNotebookK8sResource({
        name: 'test-notebook',
        displayName: 'Test Notebook',
      });

      cy.interceptK8sList(NotebookModel, mockK8sResourceList([notebookMock]));
      cy.interceptK8s(NotebookModel, notebookMock);
      cy.interceptK8sList(
        PodModel,
        mockK8sResourceList([mockPodK8sResource({ name: 'test-notebook' })]),
      );
      cy.interceptK8sList(
        RouteModel,
        mockK8sResourceList([mockRouteK8sResource({ name: 'test-notebook' })]),
      );

      workbenchPage.visit('test-project');
      const row = workbenchPage.getNotebookRow('Test Notebook');
      row.findKebab().click();
      workbenchActions.findEditWorkbenchAction().click();

      // Add 3 variables
      editSpawnerPage.findAddVariableButton().click();
      let envField = editSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Config Map');
      envField.selectEnvDataType('Key / value');
      let keyValuePair = envField.getKeyValuePair(0);
      keyValuePair.findKeyInput().fill('VAR1_KEY');
      keyValuePair.findValueInput().fill('var1_value');

      editSpawnerPage.findAddVariableButton().click();
      envField = editSpawnerPage.getEnvironmentVariableTypeField(1);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Key / value');
      keyValuePair = envField.getKeyValuePair(0);
      keyValuePair.findKeyInput().fill('VAR2_KEY');
      keyValuePair.findValueInput().fill('var2_value');

      editSpawnerPage.findAddVariableButton().click();
      envField = editSpawnerPage.getEnvironmentVariableTypeField(2);
      envField.selectEnvironmentVariableType('Config Map');
      envField.selectEnvDataType('Key / value');
      keyValuePair = envField.getKeyValuePair(0);
      keyValuePair.findKeyInput().fill('VAR3_KEY');
      keyValuePair.findValueInput().fill('var3_value');

      // Remove first — remaining should shift up correctly
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .findRemoveEnvironmentVariableButton()
        .click();

      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 2);
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .getKeyValuePair(0)
        .findKeyInput()
        .should('have.value', 'VAR2_KEY');
      editSpawnerPage
        .getEnvironmentVariableTypeField(1)
        .getKeyValuePair(0)
        .findKeyInput()
        .should('have.value', 'VAR3_KEY');

      // Remove again — last variable should survive with correct values
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .findRemoveEnvironmentVariableButton()
        .click();

      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 1);
      editSpawnerPage.getEnvironmentVariableTypeField(0).find().should('be.visible');
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .getKeyValuePair(0)
        .findKeyInput()
        .should('have.value', 'VAR3_KEY');
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .getKeyValuePair(0)
        .findValueInput()
        .should('have.value', 'var3_value');

      // Remove last, then re-add a new variable
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .findRemoveEnvironmentVariableButton()
        .click();

      editSpawnerPage.findEnvironmentVariableFields().should('have.length', 0);

      editSpawnerPage.findAddVariableButton().click();
      envField = editSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Key / value');
      envField.getKeyValuePair(0).findKeyInput().fill('SECOND_KEY');
      envField.getKeyValuePair(0).findValueInput().fill('second_value');

      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .getKeyValuePair(0)
        .findKeyInput()
        .should('have.value', 'SECOND_KEY');
      editSpawnerPage
        .getEnvironmentVariableTypeField(0)
        .getKeyValuePair(0)
        .findValueInput()
        .should('have.value', 'second_value');
    });
  });
});
