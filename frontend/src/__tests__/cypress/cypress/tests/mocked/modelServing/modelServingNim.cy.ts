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
  NotebookModel,
  PodModel,
  ProjectModel,
  PVCModel,
  RoleBindingModel,
  RouteModel,
  SecretModel,
  ServingRuntimeModel,
  StorageClassModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { mockNotebookK8sResource, mockRouteK8sResource, mockStorageClasses } from '~/__mocks__';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockConsoleLinks } from '~/__mocks__/mockConsoleLinks';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { nimDeployModal } from '~/__tests__/cypress/cypress/pages/nimModelDialog';
import {
  findNimModelDeployButton,
  findNimModelServingPlatformCard,
} from '~/__tests__/cypress/cypress/utils/nimUtils';
import type { InferenceServiceKind } from '~/k8sTypes';

const constructInterceptorsWithoutModelSelection = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableModelMesh: false,
      disableNIMModelServing: false,
    }),
  );

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ hasAnnotations: true })]),
  );
};

type EnableNimConfigType = {
  hasAllModels?: boolean;
};

const initInterceptsToEnableNim = ({ hasAllModels = false }: EnableNimConfigType) => {
  // not all interceptions here are required for the test to succeed
  // some are here to eliminate (not-blocking) error responses to ease with debugging

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'data-science-pipelines-operator': true,
        kserve: true,
        'model-mesh': true,
      },
    }),
  );

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptOdh('GET /api/builds', {});

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableModelMesh: false,
      disableNIMModelServing: false,
    }),
  );

  cy.interceptK8sList(StorageClassModel, mockK8sResourceList(mockStorageClasses));

  cy.interceptOdh('GET /api/console-links', mockConsoleLinks());

  cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());

  cy.interceptOdh('GET /api/segment-key', {});

  const project = mockProjectK8sResource({
    hasAnnotations: true,
    enableModelMesh: hasAllModels ? undefined : false,
  });
  if (project.metadata.annotations != null) {
    project.metadata.annotations['opendatahub.io/nim-support'] = 'true';
  }
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([project]));

  cy.interceptK8sList(
    NotebookModel,
    mockK8sResourceList([mockNotebookK8sResource({ namespace: 'test-project' })]),
  );

  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));

  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'test-project' })]),
  );

  cy.interceptK8sList(RoleBindingModel, mockK8sResourceList([mockRoleBindingK8sResource({})]));

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));

  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([mockAcceleratorProfile({ namespace: 'opendatahub' })]),
  );

  // TODO not required but eliminates not-blocking error response
  // cy.interceptK8sList(
  //   ServingRuntimeModel,
  //   mockK8sResourceList([
  //     mockServingRuntimeK8sResource({
  //       name: 'nvidia-nim-runtime',
  //       disableModelMeshAnnotations: true,
  //       disableResources: true,
  //       acceleratorName: 'nvidia.com/gpu',
  //       displayName: 'NVIDIA NIM',
  //     }),
  //   ]),
  // );

  // TODO not required but eliminates not-blocking error response
  // cy.interceptK8sList(
  //   InferenceServiceModel,
  //   mockK8sResourceList([mockInferenceServiceK8sResource({})])
  // );

  cy.interceptK8s(RouteModel, mockRouteK8sResource({}));

  cy.interceptOdh('GET /api/accelerators', {
    configured: true,
    available: { 'nvidia.com/gpu': 1 },
  });

  // TODO do we need to mock this?
  // cy.interceptK8s(
  //   ConfigMapModel,
  //   mockConfigMap({
  //     data: {
  //       validation_result: 'true',
  //     },
  //     namespace: 'opendatahub',
  //     name: 'nvidia-nim-validation-result',
  //   }),
  // );
};

const initInterceptsToDeployModel = (nimInferenceService: InferenceServiceKind) => {
  cy.interceptK8s(ConfigMapModel, mockNimImages());
  cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
  cy.interceptK8s('POST', InferenceServiceModel, nimInferenceService).as('createInferenceService');

  cy.interceptK8s('POST', ServingRuntimeModel, mockNimServingRuntime()).as('createServingRuntime');

  cy.intercept(
    { method: 'GET', pathname: '/api/nim-serving/nvidia-nim-access' },
      {
        response: {
          status: 200,
          body: mockNvidiaNimAccessSecret(),
      }
    });
  cy.intercept('GET', 'api/nim-serving/nvidia-nim-image-pull',
    {
      response: {
        status: 200,
        body: mockNvidiaNimImagePullSecret(),
      }});
  cy.interceptK8s('POST', PVCModel, mockNimModelPVC());
};

describe('Model Serving NIM', () => {
  it('should do something', () => {
    initInterceptsToEnableNim({});
    projectDetails.visitSection('test-project', 'model-server');
    // modelServingSection
    //   .getServingPlatformCard('nvidia-nim-platform-card')
    //   .findDeployModelButton()
    //   .click();
  });

  it('Deploy NIM model when all model cards are available', () => {
    initInterceptsToEnableNim({ hasAllModels: true });

    projectDetails.visitSection('test-project', 'model-server');
    // For multiple cards use case
    findNimModelDeployButton().click();
    cy.contains('Deploy model with NVIDIA NIM').should('be.visible');

    // test that you can not submit on empty
    nimDeployModal.shouldBeOpen();
    nimDeployModal.findSubmitButton().should('be.disabled');

    // Actual dialog tests in the next test case
  });

  it('Deploy NIM model when no cards are available', () => {
    initInterceptsToEnableNim({});
    const nimInferenceService = mockNimInferenceService();
    initInterceptsToDeployModel(nimInferenceService);

    projectDetails.visitSection('test-project', 'model-server');
    cy.findByTestId('deploy-button').should('exist');
    cy.findByTestId('deploy-button').click();
    cy.contains('Deploy model with NVIDIA NIM').should('be.visible');

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

    // nimDeployModal.shouldBeOpen(false);
  });

 it('Check if the Nim model UI enabled on Overview tab when model server platform for the project is nim', () => {
    initInterceptsToEnableNim({});
    const componentName = 'overview';
    projectDetails.visitSection('test-project', componentName);
    const overviewComponent = projectDetails.findComponent(componentName);
    overviewComponent.should('exist');
    const deployModelButton = overviewComponent.findByTestId('model-serving-platform-button');
    deployModelButton.should('exist');
    validateNvidiaNimModel(deployModelButton);
  });

 it('Check if the Nim model UI enabled on models tab when model server platform for the project is nim', () => {
    initInterceptsToEnableNim({});
    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.shouldBeEmptyState('Models', 'model-server', true);
    projectDetails.findServingPlatformLabel().should('exist');

    cy.contains('Start by adding a model server');
    cy.contains(
      'Model servers are used to deploy models and to allow apps to send requests to your models. Configuring a model server includes specifying the number of replicas being deployed, the server size, the token authentication, the serving runtime, and how the project that the model server belongs to is accessed.',
    );

    const deployButton = projectDetails.findComponent('model-server').findByTestId('deploy-button');
    validateNvidiaNimModel(deployButton);
  });

 it('Check if the Nim model UI enabled on models tab when model server platform for the project is not chosen', () => {
    constructInterceptorsWithoutModelSelection();

    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.shouldBeEmptyState('Models', 'model-server', true);
    projectDetails.findServingPlatformLabel().should('not.exist');

    projectDetails.findSingleModelDeployButton().should('exist');
    projectDetails.findMultiModelButton().should('exist');

    findNimModelServingPlatformCard().contains(
      'Models are deployed using NVIDIA NIM microservices.',
    );
    findNimModelServingPlatformCard().contains('NVIDIA NIM model serving platform');

    validateNvidiaNimModel(findNimModelDeployButton());
  });

 it('Check if the Nim model UI enabled on overview tab when model server platform for the project is not chosen', () => {
    constructInterceptorsWithoutModelSelection();
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
      .contains('NVIDIA NIM model serving platform');
    projectDetails
      .findComponent('overview')
      .findByTestId('nvidia-nim-platform-card')
      .contains('Models are deployed using NVIDIA NIM microservices.');

    validateNvidiaNimModel(
      projectDetails
        .findComponent('overview')
        .findByTestId('nvidia-nim-platform-card')
        .findByTestId('model-serving-platform-button'),
    );
  });
});

//TODO: move below methods to some test util file.
function validateNvidiaNimModel(deployButtonElement) {
  deployButtonElement.click();
  cy.contains('Deploy model with NVIDIA NIM');
  cy.contains('Configure properties for deploying your model using an NVIDIA NIM.');

  //find the form label Project with value as the Test Project
  cy.contains('label', 'Project').parent().next().find('p').should('have.text', 'Test Project');

  //close the model window
  cy.get('div[role="dialog"]').get('button[aria-label="Close"]').click();

  // now the nvidia nim window should not be visible.
  cy.contains('Deploy model with NVIDIA NIM').should('not.exist');

  deployButtonElement.click();
  //validate model submit button is disabled without entering form data
  cy.findByTestId('modal-submit-button').should('be.disabled');
  //validate nim modal cancel button
  cy.findByTestId('modal-cancel-button').click();
  cy.contains('Deploy model with NVIDIA NIM').should('not.exist');
}
