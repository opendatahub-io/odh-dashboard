import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockNimInferenceService, mockNimServingRuntime } from '#~/__mocks__/mockNimResource';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import {
  projectDetails,
  projectDetailsOverviewTab,
} from '#~/__tests__/cypress/cypress/pages/projects';
import { nimDeployModal } from '#~/__tests__/cypress/cypress/pages/components/NIMDeployModal';
import {
  initInterceptorsValidatingNimEnablement,
  initInterceptsForDeleteModel,
  initInterceptsToDeployModel,
  initInterceptsToEnableNim,
} from '#~/__tests__/cypress/cypress/utils/nimUtils';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';

describe('NIM Model Serving', () => {
  describe('Deploying a model from an existing Project', () => {
    it('should be disabled if the modal is empty (NIM already selected for project)', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      // test that you can not submit on empty
      nimDeployModal.shouldBeOpen();
      nimDeployModal.findSubmitButton().should('be.disabled');
    });

    it('should be enabled if the modal has the minimal info', () => {
      initInterceptsToEnableNim({});
      const nimInferenceService = mockNimInferenceService();
      initInterceptsToDeployModel(nimInferenceService);

      projectDetails.visitSection('test-project', 'model-server');
      cy.get('button[data-testid=deploy-button]').click();

      // test that you can not submit on empty
      nimDeployModal.shouldBeOpen();
      nimDeployModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      nimDeployModal.findModelNameInput().type('Test Name');
      // Click to activate the Typeahead input field
      nimDeployModal.findNIMToDeploy().click();

      // Type the model name to filter results
      nimDeployModal.findNIMToDeploy().type('Snowflake Arctic');

      // Wait for dropdown to appear and select the correct option
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      nimDeployModal.findSubmitButton().should('be.enabled');

      nimDeployModal.findNimStorageSizeInput().should('have.value', '30');

      // Fix: Ensure Minus button exists before clicking
      cy.get('[data-testid="pvc-size"] button[aria-label="Minus"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .click();

      nimDeployModal.findNimStorageSizeInput().should('have.value', '29');

      cy.get('[data-testid="pvc-size"] button[aria-label="Plus"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible')
        .click();

      nimDeployModal.findNimStorageSizeInput().should('have.value', '30');

      // Validate model replicas
      nimDeployModal.findMinReplicasInput().should('have.value', '1');
      nimDeployModal.findMinReplicasPlusButton().should('be.disabled');
      nimDeployModal.findMaxReplicasInput().should('have.value', '1');
      nimDeployModal.findMaxReplicasMinusButton().should('be.disabled');
      nimDeployModal.findMaxReplicasPlusButton().click();
      nimDeployModal.findMaxReplicasInput().should('have.value', '2');
      nimDeployModal.findMinReplicasPlusButton().click();
      nimDeployModal.findMinReplicasInput().should('have.value', '2');
      nimDeployModal.findMinReplicasMinusButton().click();
      nimDeployModal.findMaxReplicasMinusButton().click();

      nimDeployModal.findSubmitButton().click();

      //dry run request
      if (nimInferenceService.status) {
        delete nimInferenceService.status;
      }
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body).to.eql(nimInferenceService);
      });

      // Actual request
      cy.wait('@createInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@createInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
      });

      nimDeployModal.shouldBeOpen(false);
    });

    it('should list the deployed model in Models tab', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      projectDetails.visitSection('test-project', 'model-server');

      // Table is visible and has 1 row
      projectDetails.findKserveModelsTable().should('have.length', 1);

      // First row matches the NIM inference service details
      projectDetails
        .getKserveTableRow('Test Name')
        .findServiceRuntime()
        .should('have.text', 'NVIDIA NIM');
      projectDetails.getKserveTableRow('Test Name').findAPIProtocol().should('have.text', 'REST');

      // Open toggle to validate Model details
      projectDetails.getKserveTableRow('Test Name').findDetailsTriggerButton().click();

      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Framework')
        .should('have.text', 'arctic-embed-l');
      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Model server replicas')
        .should('have.text', '1');
      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Model server size')
        .should('contain.text', 'Custom');
      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Model server size')
        .should('contain.text', '8 CPUs, 32GiB Memory requested');
      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Model server size')
        .should('contain.text', '16 CPUs, 64GiB Memory limit');
      projectDetails
        .getKserveTableRow('Test Name')
        .findInfoValueFor('Accelerator')
        .should('have.text', 'No accelerator selected');
    });

    it('should list the deployed model in Overview tab', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      projectDetails.visit('test-project');

      // Card is visible
      projectDetailsOverviewTab
        .findDeployedModelServingRuntime('Test Name')
        .should('have.text', 'NVIDIA NIM');
    });

    it('should be blocked if failed to fetch NIM model list', () => {
      initInterceptsToEnableNim({});
      projectDetailsOverviewTab.visit('test-project');
      cy.findByTestId('model-serving-platform-button').click();
      nimDeployModal.shouldDisplayError(
        'There was a problem fetching the NIM models. Please try again later.',
      );
      nimDeployModal.findSubmitButton().should('be.disabled');
    });
  });

  describe('Enabling NIM', () => {
    describe('When NIM feature is enabled', () => {
      it("should allow deploying NIM from a Project's Overview tab when the only platform", () => {
        initInterceptsToEnableNim({});
        projectDetailsOverviewTab.visit('test-project');
        cy.findByTestId('model-serving-platform-button').click();
        nimDeployModal.shouldBeOpen();
      });

      it("should allow selecting NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: false,
        });
        projectDetailsOverviewTab.visit('test-project');
        projectDetailsOverviewTab
          .findModelServingPlatform('nvidia-nim')
          .findByTestId('nim-serving-select-button')
          .should('be.enabled');
      });

      it("should allow deploying NIM from a Project's Overview tab when NIM is selected", () => {
        initInterceptsToEnableNim({ hasAllModels: false });
        projectDetailsOverviewTab.visit('test-project');
        cy.findByTestId('model-serving-platform-button').click();
        nimDeployModal.shouldBeOpen();
      });

      it("should allow deploying NIM from a Project's Models tab when the only platform", () => {
        initInterceptsToEnableNim({});
        projectDetails.visitSection('test-project', 'model-server');
        cy.get('button[data-testid=deploy-button]').click();
        nimDeployModal.shouldBeOpen();
      });

      it("should allow selecting NIM from a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: false,
        });
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails
          .findModelServingPlatform('nvidia-nim-model')
          .findByTestId('nim-serving-select-button')
          .should('be.enabled');
      });

      it("should allow deploying NIM from a Project's Models tab when NIM is selected", () => {
        initInterceptsToEnableNim({ hasAllModels: false });
        projectDetails.visitSection('test-project', 'model-server');
        cy.get('button[data-testid=deploy-button]').click();
        nimDeployModal.shouldBeOpen();
      });
    });

    describe('When NIM feature is disabled', () => {
      it("should NOT allow deploying NIM from a Project's Overview tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: true,
          disableModelMesh: true,
          disableNIMModelServing: true,
        });
        projectDetailsOverviewTab.visit('test-project');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: true,
        });
        projectDetailsOverviewTab.visit('test-project');
        projectDetailsOverviewTab.findModelServingPlatform('nvidia-nim').should('not.exist');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Models tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: true,
          disableModelMesh: true,
          disableNIMModelServing: true,
        });
        projectDetails.visitSection('test-project', 'model-server');
        cy.get('button[data-testid=deploy-button]').should('not.exist');
      });

      it("should NOT allow deploying NIM to a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: true,
        });
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.findModelServingPlatform('nvidia-nim-model').should('not.exist');
        cy.findByTestId('nim-serving-select-button').should('not.exist');
      });
    });

    describe('When the Template is missing', () => {
      it("should NOT allow deploying NIM from a Project's Overview tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetailsOverviewTab.visit('test-project');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetailsOverviewTab.visit('test-project');
        projectDetailsOverviewTab.findModelServingPlatform('nvidia-nim').should('not.exist');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Models tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetails.visitSection('test-project', 'model-server');
        cy.get('button[data-testid=deploy-button]').should('not.exist');
      });

      it("should NOT allow deploying NIM to a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.findModelServingPlatform('nvidia-nim-model').should('not.exist');
        cy.findByTestId('nim-serving-select-button').should('not.exist');
      });
    });
  });

  describe('Deleting an existing model', () => {
    it("should be the only option available from the Project's Models tab", () => {
      initInterceptsToEnableNim({});
      initInterceptsForDeleteModel();

      // go the Models tab in the created project
      projectDetails.visitSection('test-project', 'model-server');
      // grab the deployed models table and click the kebab menu
      cy.findByTestId('kserve-model-row-item').get('button[aria-label="Kebab toggle"').click();
      cy.get('ul[role="menu"]').should('have.length', 1);
      cy.get('button').contains('Delete').should('exist');
    });

    it('should delete the underlying InferenceService and ServingRuntime', () => {
      initInterceptsToEnableNim({});
      initInterceptsForDeleteModel();

      // go the Models tab in the created project
      projectDetails.visitSection('test-project', 'model-server');
      // grab the deployed models table and click the kebab menu
      cy.findByTestId('kserve-model-row-item').get('button[aria-label="Kebab toggle"').click();
      // grab the delete menu and click it
      cy.get('button').contains('Delete').click();
      // grab the delete menu window and put in the project name
      deleteModal.findInput().type('Test Name');
      // grab the delete button and click it
      deleteModal.findSubmitButton().click();

      // verify the model was deleted
      cy.wait('@deleteInference');
      cy.wait('@deleteRuntime');
    });
  });

  describe('Checking AuthServingRuntimeSection - Model Route and Token Authentication', () => {
    it('should show or hide the alert based on route and token settings', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      projectDetailsOverviewTab.visit('test-project');
      cy.findByTestId('model-serving-platform-button').click();
      nimDeployModal.shouldBeOpen();

      // should display and interact with the "Model route" checkbox
      nimDeployModal
        .findModelRouteCheckbox()
        .scrollIntoView()
        .should('be.visible')
        .should('not.be.checked');
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findModelRouteCheckbox().should('be.checked');
      nimDeployModal.findModelRouteCheckbox().uncheck();
      nimDeployModal.findModelRouteCheckbox().should('not.be.checked');

      // should enable the "Authentication" checkbox when "Model route" is checked
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findAuthenticationCheckbox().should('be.checked');

      // should display a warning alert if "Model route" is checked but "Authentication" is unchecked
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findAuthenticationCheckbox().uncheck();
      nimDeployModal.findExternalRouteError().should('exist');

      // Check external route
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findAuthenticationCheckbox().uncheck();
      nimDeployModal.findExternalRouteError().should('exist');

      // Uncheck external route
      nimDeployModal.findModelRouteCheckbox().uncheck();
      nimDeployModal.findExternalRouteError().should('not.exist');

      // Re-enable authentication
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findAuthenticationCheckbox().check();
      nimDeployModal.findExternalRouteError().should('not.exist');

      // should display the default service account name when "Model route" is checked
      nimDeployModal.findModelRouteCheckbox().check();
      nimDeployModal.findServiceAccountNameInput().should('have.value', 'default-name');
    });
  });
});
