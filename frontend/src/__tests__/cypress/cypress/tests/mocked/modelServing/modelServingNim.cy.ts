import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import {
  mockNimImages,
  mockNimInferenceService,
  mockNimServingRuntime,
} from '~/__mocks__/mockNimResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
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
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
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
import { findServingPlatformLabel } from '~/__tests__/cypress/cypress/utils/nimUtils';

const initInterceptsToEnableNim = () => {
  // not all interceptions here are required for the test to succeed
  // some are here to eliminate (not-blocking) error responses to ease with debugging

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true },
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

  const project = mockProjectK8sResource({ hasAnnotations: true, enableModelMesh: false });
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

  const templateMock = mockServingRuntimeTemplateK8sResource({
    name: 'nvidia-nim-serving-template',
    displayName: 'NVIDIA NIM',
    platforms: [ServingRuntimePlatform.SINGLE],
    apiProtocol: ServingRuntimeAPIProtocol.REST,
    namespace: 'opendatahub',
  });
  if (templateMock.metadata.annotations != null) {
    templateMock.metadata.annotations['opendatahub.io/dashboard'] = 'true';
  }

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

const initInterceptsToDeployModel = () => {
  cy.interceptK8s(ConfigMapModel, mockNimImages());
  cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
  cy.interceptK8s('POST', InferenceServiceModel, mockNimInferenceService()).as(
    'createInferenceService',
  );

  cy.interceptK8s('POST', ServingRuntimeModel, mockNimServingRuntime()).as('createServingRuntime');
};

describe('Model Serving NIM', () => {
  it('should do something', () => {
    initInterceptsToEnableNim();
    projectDetails.visitSection('test-project', 'model-server');
    // modelServingSection
    //   .getServingPlatformCard('nvidia-nim-platform-card')
    //   .findDeployModelButton()
    //   .click();
  });

  it('Deploy NIM model', () => {
    initInterceptsToEnableNim();
    initInterceptsToDeployModel();

    projectDetails.visitSection('test-project', 'model-server');
    // For multiple cards use case
    // findNimModelDeployButton().click();
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
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-name',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'Test Name',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'llama-2-13b-chat' },
              runtime: 'test-name',
              storage: { key: 'test-secret', path: 'test-model/' },
            },
            resources: {
              limits: { cpu: '2', memory: '8Gi' },
              requests: { cpu: '1', memory: '4Gi' },
            },
          },
        },
      });
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
    });
  });

  //TODO: This work is done by Lokesh
  it('Check if the Nim Model UI is enabled', () => {
    // initIntercepts({
    //   templates: true,
    //   disableKServeConfig: false,
    //   disableModelConfig: false,
    //   disableNIMModelServing: false,
    // });

    initInterceptsToEnableNim();

    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.shouldBeEmptyState('Models', 'model-server', true);

    findServingPlatformLabel().should('exist');
    cy.findByTestId('empty-state-title').should('exist');
    cy.findByTestId('deploy-button').should('exist');

    // projectDetails
    //   .findNimModelServingPlatformCard()
    //   .contains('Models are deployed using NVIDIA NIM microservices.');
    // projectDetails
    //   .findNimModelServingPlatformCard()
    //   .contains('NVIDIA NIM model serving platform');
  });
});
