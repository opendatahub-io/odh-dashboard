import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import {
  mockNimInferenceService,
  mockNimServingRuntime,
  mockNimServingRuntimeWithPVC,
  mockMultipleNimPVCs,
  mockMultipleNimServingRuntimes,
  mockNimImages,
  mockNimServingResource,
} from '#~/__mocks__/mockNimResource';
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
      const nimInferenceService = mockNimInferenceService({
        resources: {
          limits: {
            cpu: '2',
            memory: '4Gi',
          },
          requests: {
            cpu: '2',
            memory: '4Gi',
          },
        },
      });
      nimInferenceService.metadata.annotations = {
        ...nimInferenceService.metadata.annotations,
        'opendatahub.io/hardware-profile-name': 'default-profile',
        'opendatahub.io/hardware-profile-namespace': 'opendatahub',
        'opendatahub.io/hardware-profile-resource-version': '1309350',
      };
      initInterceptsToDeployModel(nimInferenceService);

      projectDetails.visitSection('test-project', 'model-server');
      projectDetails.findTopLevelDeployModelButton().click();

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

      // Temp until KEDA is supported
      nimDeployModal.findNimModelReplicas().should('have.value', '1');

      /* TODO: Enable replica validation when KEDA autoscaling is supported */
      // // Validate model replicas
      // nimDeployModal.findMinReplicasInput().should('have.value', '1');
      // nimDeployModal.findMinReplicasPlusButton().should('be.disabled');
      // nimDeployModal.findMaxReplicasInput().should('have.value', '1');
      // nimDeployModal.findMaxReplicasMinusButton().should('be.disabled');
      // nimDeployModal.findMaxReplicasPlusButton().click();
      // nimDeployModal.findMaxReplicasInput().should('have.value', '2');
      // nimDeployModal.findMinReplicasPlusButton().click();
      // nimDeployModal.findMinReplicasInput().should('have.value', '2');
      // nimDeployModal.findMinReplicasMinusButton().click();
      // nimDeployModal.findMaxReplicasMinusButton().click();

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
      // cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      const nimInferenceService = mockNimInferenceService({});
      nimInferenceService.metadata.annotations = {
        ...nimInferenceService.metadata.annotations,
        'opendatahub.io/hardware-profile-name': 'default-profile',
        'opendatahub.io/hardware-profile-namespace': 'opendatahub',
        'opendatahub.io/hardware-profile-resource-version': '1309350',
      };
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([nimInferenceService]));

      projectDetails.visitSection('test-project', 'model-server');

      // Table is visible and has 1 row
      projectDetails.findKserveModelsTable().should('have.length', 1);

      // First row matches the NIM inference service details
      projectDetails
        .getKserveTableRow('Test Name')
        .findServiceRuntime()
        .should('contain.text', 'NVIDIA NIM');
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
        .findInfoValueFor('Hardware profile')
        .should('have.text', 'default-profile');
    });

    it('should list the deployed model in Overview tab', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      projectDetails.visit('test-project');

      // Card is visible
      projectDetailsOverviewTab
        .findDeployedModelServingRuntime('Test Name')
        .should('contain.text', 'NVIDIA NIM');
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
          disableNIMModelServing: false,
        });
        projectDetailsOverviewTab.visit('test-project');
        projectDetailsOverviewTab.findSelectPlatformButton('nvidia-nim').should('be.enabled');
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
          disableNIMModelServing: false,
        });
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.findSelectPlatformButton('nvidia-nim').should('be.enabled');
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
          disableNIMModelServing: true,
        });
        projectDetailsOverviewTab.visit('test-project');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableNIMModelServing: true,
        });
        projectDetailsOverviewTab.visit('test-project');
        projectDetailsOverviewTab.findModelServingPlatform('nvidia-nim').should('not.exist');
        cy.findByTestId('model-serving-platform-button').should('not.exist');
      });

      it("should NOT allow deploying NIM from a Project's Models tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: true,
          disableNIMModelServing: true,
        });
        projectDetails.visitSection('test-project', 'model-server');
        cy.get('button[data-testid=deploy-button]').should('not.exist');
      });

      it("should NOT allow deploying NIM to a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsValidatingNimEnablement({
          disableKServe: false,
          disableNIMModelServing: true,
        });
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.findModelServingPlatform('nvidia-nim').should('not.exist');
        projectDetails.findSelectPlatformButton('nvidia-nim').should('not.exist');
      });
    });

    describe('When the Template is missing', () => {
      it("should NOT allow deploying NIM from a Project's Overview tab when the only platform", () => {
        initInterceptorsValidatingNimEnablement(
          {
            disableKServe: false,
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
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.findModelServingPlatform('nvidia-nim').should('not.exist');
        projectDetails.findSelectPlatformButton('nvidia-nim').should('not.exist');
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

describe('PVC Storage Management', () => {
  describe('Storage Option Selection', () => {
    it('should default to "Create new storage" when no existing compatible PVCs are found', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      // Mock NIM models data
      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      // Mock empty ServingRuntime lists (no existing compatible storage)
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      // Fill in required fields to show storage options
      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      // Should show both storage options
      nimDeployModal.shouldShowCreateNewPVCOption();
      nimDeployModal.shouldShowUseExistingPVCOption();

      // "Create new storage" should be selected by default
      nimDeployModal.findCreateNewPVCRadio().should('be.checked');
      nimDeployModal.findUseExistingPVCRadio().should('not.be.checked');

      // Should show PVC size section for new storage
      nimDeployModal.findPVCSizeSection().should('be.visible');
      nimDeployModal.findNimStorageSizeInput().should('have.value', '30');
    });

    it('should allow switching between "Create new" and "Use existing" storage options', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      // Mock NIM models data
      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      // Mock existing compatible ServingRuntimes AND the PVCs they reference
      const mockServingRuntimes = mockMultipleNimServingRuntimes();
      const mockPVCs = mockMultipleNimPVCs();

      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(mockServingRuntimes)).as(
        'servingruntimes',
      );
      // Add PVC mocks - the hook likely fetches these by name
      cy.intercept('GET', '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims*', {
        body: mockK8sResourceList(mockPVCs),
      });

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      // Fill in required fields
      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      // Initially "Create new storage" should be selected
      nimDeployModal.findCreateNewPVCRadio().should('be.checked');
      nimDeployModal.findPVCSizeSection().should('be.visible');

      // Switch to "Use existing storage"
      nimDeployModal.selectUseExistingPVC();

      // Wait for the PVC discovery to complete
      cy.wait('@servingruntimes');

      // Should show existing PVC selection UI
      nimDeployModal.findPVCSelectionSection().should('be.visible');
      nimDeployModal.shouldShowCompatiblePVCs(2); // 2 compatible arctic-embed-l PVCs

      // Switch back to "Create new storage"
      nimDeployModal.selectCreateNewPVC();
      nimDeployModal.findCreateNewPVCRadio().should('be.checked');
      nimDeployModal.findPVCSizeSection().should('be.visible');
    });
  });

  describe('Compatible PVC Detection', () => {
    it('should show compatible PVCs that contain the selected model', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      const mockServingRuntimes = mockMultipleNimServingRuntimes();
      const mockPVCs = mockMultipleNimPVCs();

      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(mockServingRuntimes)).as(
        'servingruntimes',
      );
      cy.intercept('GET', '**/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims**', {
        statusCode: 200,
        body: mockK8sResourceList(mockPVCs),
      }).as('pvcs');

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      // Fill in required fields - select Arctic model
      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      // Verify and switch to existing storage
      nimDeployModal.findCreateNewPVCRadio().should('be.visible').should('be.checked');
      nimDeployModal.findUseExistingPVCRadio().should('be.visible').should('not.be.checked');
      nimDeployModal.selectUseExistingPVC();
      nimDeployModal.findUseExistingPVCRadio().should('be.checked');
      nimDeployModal.findCreateNewPVCRadio().should('not.be.checked');

      // Wait for both API calls
      cy.wait('@servingruntimes');
      cy.wait('@pvcs');

      // Should show 2 compatible PVCs for arctic-embed-l model
      nimDeployModal.shouldShowCompatiblePVCs(2);

      // Open dropdown and verify PVC options
      nimDeployModal.findExistingPVCSelectByText().click({ force: true });
      cy.get('[role="listbox"]', { timeout: 8000 }).should('be.visible');
      cy.get('[role="listbox"]').should('contain.text', 'nim-pvc-arctic-recent');
      cy.get('[role="listbox"]').should('contain.text', 'nim-pvc-arctic-old');
      cy.get('[role="listbox"]').should('contain.text', 'From: arctic-runtime-1');
      cy.get('[role="listbox"]').should('contain.text', 'From: arctic-runtime-2');
      cy.get('[role="listbox"]').should('not.contain.text', 'nim-pvc-alphafold');
    });

    it('should show "no compatible storage" when no PVCs match the selected model', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      const alphafoldRuntime = mockNimServingRuntimeWithPVC({
        name: 'alphafold-runtime',
        pvcName: 'nim-pvc-alphafold-only',
        modelName: 'alphafold2',
      });

      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([alphafoldRuntime]));

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      nimDeployModal.selectUseExistingPVC();
      nimDeployModal.shouldShowNoCompatiblePVCsAlert();
      nimDeployModal.shouldDisableManualPVCInput();
      nimDeployModal.shouldDisableModelPathInput();

      cy.findByTestId('no-compatible-pvcs-warning').should(
        'contain.text',
        'Field disabled - no compatible storage found',
      );
      cy.findByTestId('model-path-disabled-warning').should(
        'contain.text',
        'Field disabled - no compatible storage found',
      );
    });

    it('should handle PVC loading states', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      cy.intercept(
        'GET',
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
        {
          delay: 2000,
          body: mockK8sResourceList([]),
        },
      ).as('servingruntimes');

      cy.intercept('GET', '**/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims**', {
        delay: 2000,
        body: mockK8sResourceList([]),
      }).as('pvcs');

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      nimDeployModal.selectUseExistingPVC();

      cy.get('[data-testid="pvc-loading-spinner"]').then(($spinner) => {
        if ($spinner.length > 0) {
          cy.wrap($spinner).should('be.visible');
        }
      });

      cy.wait('@servingruntimes');
      cy.wait('@pvcs');
      nimDeployModal.shouldShowNoCompatiblePVCsAlert();
    });

    it('should allow selecting an existing PVC and auto-set model path', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      const mockServingRuntimes = mockMultipleNimServingRuntimes();
      const mockPVCs = mockMultipleNimPVCs();

      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(mockServingRuntimes)).as(
        'servingruntimes',
      );
      cy.intercept('GET', '**/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims**', {
        statusCode: 200,
        body: mockK8sResourceList(mockPVCs),
      }).as('pvcs');

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      nimDeployModal.selectUseExistingPVC();

      cy.wait('@servingruntimes');
      cy.wait('@pvcs');

      nimDeployModal.shouldShowCompatiblePVCs(2);

      nimDeployModal.selectExistingPVCRobust('nim-pvc-arctic-recent');

      nimDeployModal.shouldHaveModelPath('/mnt/models/cache');

      nimDeployModal.setModelPath('/custom/model/path');
      nimDeployModal.shouldHaveModelPath('/custom/model/path');
    });

    it('should enable submit button when all required fields are filled with existing PVC', () => {
      initInterceptsToEnableNim({ hasAllModels: false });

      cy.intercept('GET', '/api/nim-serving/nimConfig', mockNimServingResource(mockNimImages()));

      const mockServingRuntimes = mockMultipleNimServingRuntimes();
      const mockPVCs = mockMultipleNimPVCs();

      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(mockServingRuntimes)).as(
        'servingruntimes',
      );
      cy.intercept('GET', '**/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims**', {
        statusCode: 200,
        body: mockK8sResourceList(mockPVCs),
      }).as('pvcs');

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').click();

      nimDeployModal.shouldBeOpen();

      nimDeployModal.findSubmitButton().should('be.disabled');

      nimDeployModal.findModelNameInput().type('Test Model');
      nimDeployModal.findNIMToDeploy().click().type('Snowflake Arctic');
      cy.get('[role="listbox"]').contains('Snowflake Arctic Embed Large Embedding - 1.0.0').click();

      nimDeployModal.selectUseExistingPVC();

      cy.wait('@servingruntimes');
      cy.wait('@pvcs');

      nimDeployModal.shouldShowCompatiblePVCs(2);

      nimDeployModal.selectExistingPVCRobust('nim-pvc-arctic-recent');

      nimDeployModal.findSubmitButton().should('be.enabled');
    });
  });
});
