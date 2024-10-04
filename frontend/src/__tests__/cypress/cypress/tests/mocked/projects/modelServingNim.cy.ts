import type { MockDashboardConfigType } from '~/__mocks__/mockDashboardConfig';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import {
  mockNimImages,
  mockNimInferenceService,
  mockNimModelPVC,
  mockNimServingRuntime,
  mockNimServingRuntimeTemplate,
  mockNvidiaNimAccessSecret,
  mockNvidiaNimImagePullSecret,
} from '~/__mocks__/mockNimResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import {
  AcceleratorProfileModel,
  ConfigMapModel,
  InferenceServiceModel,
  ProjectModel,
  PVCModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mock200Status } from '~/__mocks__';
import { nimDeployModal } from '~/__tests__/cypress/cypress/pages/nimModelDialog';
import {
  findNimModelDeployButton,
  findNimModelServingPlatformCard,
  modalDialogTitle,
  validateNimInmferenceModelsTable,
  validateNimModelsTable,
  validateNimOverviewModelsTable,
  validateNvidiaNimModel,
} from '~/__tests__/cypress/cypress/utils/nimUtils';
import type { InferenceServiceKind } from '~/k8sTypes';
import { modelServingGlobal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

type EnableNimConfigType = {
  hasAllModels?: boolean;
};
// intercept all APIs required for creating a new project without selecting the model runtime from available models run times.
const initInterceptorsForNewProjectWithoutModelSelection = (
  dashboardConfig: MockDashboardConfigType,
  disableServingRuntime = false,
) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(dashboardConfig));

  if (!disableServingRuntime) {
    const templateMock = mockNimServingRuntimeTemplate();
    cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
    cy.interceptK8s(TemplateModel, templateMock);
  }

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ hasAnnotations: true })]),
  );
};

// intercept all APIs required for enabling NIM
const initInterceptsToEnableNim = ({ hasAllModels = false }: EnableNimConfigType) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: true,
        'model-mesh': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableModelMesh: false,
      disableNIMModelServing: false,
    }),
  );

  const project = mockProjectK8sResource({
    hasAnnotations: true,
    enableModelMesh: hasAllModels ? undefined : false,
  });
  if (project.metadata.annotations != null) {
    project.metadata.annotations['opendatahub.io/nim-support'] = 'true';
  }
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([project]));

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([mockAcceleratorProfile({ namespace: 'opendatahub' })]),
  );

  cy.intercept('GET', '/api/accelerators', {
    configured: true,
    available: { 'nvidia.com/gpu': 1 },
    total: { 'nvidia.com/gpu': 1 },
    allocated: { 'nvidia.com/gpu': 1 },
  });
};

// intercept all APIs required for deploying new models in existing projects
const initInterceptsToDeployModel = (nimInferenceService: InferenceServiceKind) => {
  cy.interceptK8s(ConfigMapModel, mockNimImages());
  cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
  cy.interceptK8s('POST', InferenceServiceModel, nimInferenceService).as('createInferenceService');

  cy.interceptK8s('POST', ServingRuntimeModel, mockNimServingRuntime()).as('createServingRuntime');

  // NOTES: `body` field is needed!
  cy.intercept(
    { method: 'GET', pathname: '/api/nim-serving/nvidia-nim-images-data' },
    {
      body: { body: mockNimImages() },
    },
  );
  cy.intercept(
    { method: 'GET', pathname: '/api/nim-serving/nvidia-nim-access' },
    { body: { body: mockNvidiaNimAccessSecret() } },
  );
  cy.intercept('GET', 'api/nim-serving/nvidia-nim-image-pull', {
    body: { body: mockNvidiaNimImagePullSecret() },
  });
  cy.interceptK8s('POST', PVCModel, mockNimModelPVC());
};

// intercept all APIs required for deleting an existing model
const initInterceptsForDeleteModel = () => {
  // create initial inference and runtime
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

  // intercept delete inference request
  cy.interceptK8s(
    'DELETE',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteInference');

  // intercept delete runtime request
  cy.interceptK8s(
    'DELETE',
    {
      model: ServingRuntimeModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteRuntime');
};

describe('NIM Model Serving', () => {
  describe('Deploying a model from an existing Project', () => {
    it('should be disabled if the card is empty', () => {
      initInterceptsToEnableNim({ hasAllModels: true });

      projectDetails.visitSection('test-project', 'model-server');
      // For multiple cards use case
      findNimModelDeployButton().click();
      cy.contains(modalDialogTitle).should('be.visible');

      // test that you can not submit on empty
      nimDeployModal.shouldBeOpen();
      nimDeployModal.findSubmitButton().should('be.disabled');
    });

    it('should be enabled if the card has the minimal info', () => {
      initInterceptsToEnableNim({});
      const nimInferenceService = mockNimInferenceService();
      initInterceptsToDeployModel(nimInferenceService);

      projectDetails.visitSection('test-project', 'model-server');
      cy.findByTestId('deploy-button').should('exist');
      cy.findByTestId('deploy-button').click();
      cy.contains(modalDialogTitle).should('be.visible');

      // test that you can not submit on empty
      nimDeployModal.shouldBeOpen();
      nimDeployModal.findSubmitButton().should('be.disabled');

      // test filling in minimum required fields
      nimDeployModal.findModelNameInput().type('Test Name');
      nimDeployModal
        .findNIMToDeploy()
        .findSelectOption('Snowflake Arctic Embed Large Embedding - 1.0.0')
        .click();
      nimDeployModal.findSubmitButton().should('be.enabled');

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

      validateNimModelsTable();
    });

    it('should list the deployed model in Overview tab', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      projectDetails.visitSection('test-project', 'overview');

      validateNimOverviewModelsTable();
      validateNimModelsTable();
      projectDetails.visitSection('test-project', 'overview');
    });

    it('should list the deployed model in Model Serving page', () => {
      initInterceptsToEnableNim({ hasAllModels: false });
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      modelServingGlobal.visit('test-project');

      validateNimInmferenceModelsTable();
    });
  });

  describe('Enabling NIM', () => {
    describe('When NIM feature is enabled', () => {
      it("should allow deploying NIM from a Project's Overview tab when the only platform", () => {
        initInterceptsToEnableNim({});
        const componentName = 'overview';
        projectDetails.visitSection('test-project', componentName);
        const overviewComponent = projectDetails.findComponent(componentName);
        overviewComponent.should('exist');
        const deployModelButton = overviewComponent.findByTestId('model-serving-platform-button');
        deployModelButton.should('exist');
        validateNvidiaNimModel(deployModelButton);
      });

      it("should allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: false,
        });
        projectDetails.visitSection('test-project', 'overview');

        projectDetails
          .findComponent('overview')
          .findByTestId('single-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');
        projectDetails
          .findComponent('overview')
          .findByTestId('multi-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');

        projectDetails
          .findComponent('overview')
          .findByTestId('nvidia-nim-platform-card')
          .should('contain', 'NVIDIA NIM model serving platform')
          .and('contain', 'Models are deployed using NVIDIA NIM microservices.');

        validateNvidiaNimModel(
          projectDetails
            .findComponent('overview')
            .findByTestId('nvidia-nim-platform-card')
            .findByTestId('model-serving-platform-button'),
        );
      });

      it("should allow deploying NIM from a Project's Models tab when the only platform", () => {
        initInterceptsToEnableNim({});
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.shouldBeEmptyState('Models', 'model-server', true);
        projectDetails.findServingPlatformLabel().should('exist');

        cy.contains('Start by adding a model server');
        cy.contains(
          'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed.',
        );

        const deployButton = projectDetails
          .findComponent('model-server')
          .findByTestId('deploy-button');
        validateNvidiaNimModel(deployButton);
      });

      it("should allow deploying NIM from a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: false,
        });

        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.shouldBeEmptyState('Models', 'model-server', true);
        projectDetails.findServingPlatformLabel().should('not.exist');

        projectDetails.findSingleModelDeployButton().should('exist');
        projectDetails.findMultiModelButton().should('exist');

        findNimModelServingPlatformCard()
          .should('contain', 'Models are deployed using NVIDIA NIM microservices.')
          .and('contain', 'NVIDIA NIM model serving platform');

        validateNvidiaNimModel(findNimModelDeployButton());
      });
    });

    describe('When NIM feature is disabled', () => {
      it("should NOT allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: true,
        });

        projectDetails.visitSection('test-project', 'overview');

        projectDetails
          .findComponent('overview')
          .findByTestId('single-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');
        projectDetails
          .findComponent('overview')
          .findByTestId('multi-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');

        projectDetails
          .findComponent('overview')
          .find('[data-testid="nvidia-nim-platform-card"]')
          .should('not.exist');

        cy.contains('NVIDIA NIM model serving platform').should('not.exist');
        cy.contains('Models are deployed using NVIDIA NIM microservices.').should('not.exist');
      });

      it("should NOT allow deploying NIM to a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection({
          disableKServe: false,
          disableModelMesh: false,
          disableNIMModelServing: true,
        });
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.shouldBeEmptyState('Models', 'model-server', true);
        projectDetails.findServingPlatformLabel().should('not.exist');

        projectDetails.findSingleModelDeployButton().should('exist');
        projectDetails.findMultiModelButton().should('exist');

        findNimModelServingPlatformCard().should('not.exist');
        cy.contains('NVIDIA NIM model serving platform').should('not.exist');
        cy.contains('Models are deployed using NVIDIA NIM microservices.').should('not.exist');
      });
    });

    describe('When missing the Template', () => {
      it("should NOT allow deploying NIM from a Project's Overview tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );

        projectDetails.visitSection('test-project', 'overview');

        projectDetails
          .findComponent('overview')
          .findByTestId('single-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');
        projectDetails
          .findComponent('overview')
          .findByTestId('multi-serving-platform-card')
          .findByTestId('model-serving-platform-button')
          .should('exist');

        projectDetails
          .findComponent('overview')
          .find('[data-testid="nvidia-nim-platform-card"]')
          .should('not.exist');

        cy.contains('NVIDIA NIM model serving platform').should('not.exist');
        cy.contains('Models are deployed using NVIDIA NIM microservices.').should('not.exist');
      });

      it("should NOT allow deploying NIM to a Project's Models tab when multiple platforms exist", () => {
        initInterceptorsForNewProjectWithoutModelSelection(
          {
            disableKServe: false,
            disableModelMesh: false,
            disableNIMModelServing: false,
          },
          true,
        );
        projectDetails.visitSection('test-project', 'model-server');
        projectDetails.shouldBeEmptyState('Models', 'model-server', true);
        projectDetails.findServingPlatformLabel().should('not.exist');

        projectDetails.findSingleModelDeployButton().should('exist');
        projectDetails.findMultiModelButton().should('exist');

        findNimModelServingPlatformCard().should('not.exist');
        cy.contains('NVIDIA NIM model serving platform').should('not.exist');
        cy.contains('Models are deployed using NVIDIA NIM microservices.').should('not.exist');
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

    // TODO this is the only test-case testing the global model serving section, the rest test projects.
    // TODO should we move this one test-case to ../modelServing ?
    it('should be the only option available for NIM Models in the Global Serving Models section', () => {
      initInterceptsToEnableNim({});
      cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
      cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

      modelServingGlobal.visit('test-project');
      modelServingGlobal.getModelRow('Test Name').get('button[aria-label="Kebab toggle"]').click();

      modelServingGlobal
        .getModelRow('Test Name')
        .get('button[role="menuitem"]')
        .should('have.length', 1);
      modelServingGlobal
        .getModelRow('Test Name')
        .get('button[role="menuitem"]')
        .contains('Delete')
        .should('exist');
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
});
