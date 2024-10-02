import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  AcceleratorProfileModel,
  ConfigMapModel, InferenceServiceModel,
  NotebookModel,
  PodModel,
  ProjectModel,
  PVCModel,
  RoleBindingModel,
  RouteModel,
  SecretModel, ServingRuntimeModel,
  StorageClassModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import {
  mockInferenceServiceK8sResource,
  mockNotebookK8sResource,
  mockRouteK8sResource, mockServingRuntimeK8sResource,
  mockStorageClasses
} from '~/__mocks__';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockConsoleLinks } from '~/__mocks__/mockConsoleLinks';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import {
  nimDeployModal,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {getNIMResource} from "~/pages/modelServing/screens/projects/nimUtils";

const initIntercepts = () => {
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

  cy.interceptK8s(
    ConfigMapModel,
    mockConfigMap({
      name: 'nvidia-nim-images-data',
      namespace: 'opendatahub',
      data: {
        alphafold2:
          '{' +
          '   "name": "alphafold2",' +
          '   "displayName": "AlphaFold2",' +
          '   "shortDescription": "A widely used model for predicting the 3D structures of proteins from their amino acid sequences.",' +
          '   "namespace": "nim/deepmind",' +
          '   "tags": [' +
          '   "1.0.0"' +
          '   ],' +
          '   "latestTag": "1.0.0",' +
          '   "updatedDate": "2024-08-27T01:51:55.642Z"' +
          '  }',
        'arctic-embed-l':
          '{' +
          '   "name": "arctic-embed-l",' +
          '   "displayName": "Snowflake Arctic Embed Large Embedding",' +
          '   "shortDescription": "NVIDIA NIM for GPU accelerated Snowflake Arctic Embed Large Embedding inference",' +
          '   "namespace": "nim/snowflake",' +
          '   "tags": [' +
          '   "1.0.1",' +
          '   "1.0.0"' +
          '   ],' +
          '   "latestTag": "1.0.1",' +
          '   "updatedDate": "2024-07-27T00:38:40.927Z"' +
          '  }',
      },
    }),
  );
};

describe('Model Serving NIM', () => {



  it('should do something', () => {
    initIntercepts();
    projectDetails.visitSection('test-project', 'model-server');
    // modelServingSection
    //   .getServingPlatformCard('nvidia-nim-platform-card')
    //   .findDeployModelButton()
    //   .click();
  });

  //TODO: Work by Daniel
  it('Deploy NIM model', () => {
    //TODO: abstract the dependency from projectDetails.cy.ts
    // initInterceptsForNIM({
    //   templates: true,
    //   disableKServeConfig: false,
    //   disableModelConfig: false,
    //   disableNIMModelServing: false,
    // });

    initIntercepts();
    cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
    cy.interceptK8s(
      'POST',
      InferenceServiceModel,
      mockInferenceServiceK8sResource({
        name: 'test-name',
        path: 'test-model/',
        modelName: 'llama-2-13b-chat',
        runtimeName: 'test-name',
        displayName: 'Test Name',
        isModelMesh: true,
      }),
    ).as('createInferenceService');

    cy.interceptK8s(
      'POST',
      ServingRuntimeModel,
      mockServingRuntimeK8sResource({
        templateDisplayName: 'NVIDIA NIM',
        templateName: 'nvidia-nim-runtime',
      }),
    ).as('createServingRuntime');

    cy.interceptK8s(
      ConfigMapModel,
      mockConfigMap({
        data: {
          alphafold2:
            '{\n "name": "alphafold2",\n "displayName": "AlphaFold2",\n "shortDescription": "A widely used model for predicting the 3D structures of proteins from their amino acid sequences.",\n "namespace": "nim/deepmind",\n "tags": [\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-27T01:51:55.642Z"\n}',
          'arctic-embed-l':
            '{\n "name": "arctic-embed-l",\n "displayName": "Snowflake Arctic Embed Large Embedding",\n "shortDescription": "NVIDIA NIM for GPU accelerated Snowflake Arctic Embed Large Embedding inference",\n "namespace": "nim/snowflake",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:38:40.927Z"\n}',
          diffdock:
            '{\n "name": "diffdock",\n "displayName": "DiffDock",\n "shortDescription": "Diffdock predicts the 3D structure of the interaction between a molecule and a protein.",\n "namespace": "nim/mit",\n "tags": [\n "1.2.0"\n ],\n "latestTag": "1.2.0",\n "updatedDate": "2024-07-31T01:07:09.680Z"\n}',
          'fastpitch-hifigan-tts':
            '{\n "name": "fastpitch-hifigan-tts",\n "displayName": "TTS FastPitch HifiGAN Riva",\n "shortDescription": "RIVA TTS NIM provide easy access to state-of-the-art text to speech models, capable of synthesizing English speech from text",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-06T16:18:02.346Z"\n}',
          'llama-2-13b-chat':
            '{\n "name": "llama-2-13b-chat",\n "displayName": "meta-llama-2-13b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 13B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1",\n "1.0",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:10:56.252Z"\n}',
          'llama-2-70b-chat':
            '{\n "name": "llama-2-70b-chat",\n "displayName": "meta-llama-2-70b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:09:42.812Z"\n}',
          'llama-2-7b-chat':
            '{\n "name": "llama-2-7b-chat",\n "displayName": "meta-llama-2-7b-chat",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 2 7B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-21T16:09:01.084Z"\n}',
          'llama-3-taiwan-70b-instruct':
            '{\n "name": "llama-3-taiwan-70b-instruct",\n "displayName": "Llama-3-Taiwan-70B-Instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama-3-Taiwan-70B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/yentinglin",\n "tags": [\n "latest",\n "1.1.2",\n "1.1",\n "1"\n ],\n "latestTag": "latest",\n "updatedDate": "2024-08-28T03:24:13.146Z"\n}',
          'llama-3.1-405b-instruct':
            '{\n "name": "llama-3.1-405b-instruct",\n "displayName": "Llama-3.1-405b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 405B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.2.0",\n "1.2",\n "1.1.2",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.2.0",\n "updatedDate": "2024-09-11T03:47:21.693Z"\n}',
          'llama-3.1-70b-instruct':
            '{\n "name": "llama-3.1-70b-instruct",\n "displayName": "Llama-3.1-70b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.2.1",\n "1.2",\n "1.1.2",\n "1.1.1",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.2",\n "updatedDate": "2024-09-20T22:01:11.799Z"\n}',
          'llama-3.1-8b-base':
            '{\n "name": "llama-3.1-8b-base",\n "displayName": "Llama-3.1-8b-base",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3.1 8B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.1.2",\n "1.1.1",\n "1.1",\n "1",\n "latest",\n "1.1.0"\n ],\n "latestTag": "1.1.2",\n "updatedDate": "2024-08-21T15:54:19.302Z"\n}',
          'llama3-70b-instruct':
            '{\n "name": "llama3-70b-instruct",\n "displayName": "Meta/Llama3-70b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3 70B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "1.0.1",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-09-23T18:15:48.418Z"\n}',
          'llama3-8b-instruct':
            '{\n "name": "llama3-8b-instruct",\n "displayName": "Meta/Llama3-8b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Llama 3 8B inference through OpenAI compatible APIs",\n "namespace": "nim/meta",\n "tags": [\n "1.0.3",\n "1.0",\n "1",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.3",\n "updatedDate": "2024-08-03T21:47:11.384Z"\n}',
          'megatron-1b-nmt':
            '{\n "name": "megatron-1b-nmt",\n "displayName": "NMT Megatron Riva 1b",\n "shortDescription": "Riva NMT NIM provide easy access to state-of-the-art neural machine translation (NMT) models, capable of translating text from one language to another with exceptional accuracy.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-06T01:30:36.789Z"\n}',
          'mistral-7b-instruct-v0.3':
            '{\n "name": "mistral-7b-instruct-v0.3",\n "displayName": "Mistral-7B-Instruct-v0.3",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mistral-7B-Instruct-v0.3 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.1",\n "1.1.2",\n "1",\n "latest"\n ],\n "latestTag": "latest",\n "updatedDate": "2024-09-10T16:21:20.547Z"\n}',
          'mistral-nemo-12b-instruct':
            '{\n "name": "mistral-nemo-12b-instruct",\n "displayName": "Mistral-Nemo-12B-Instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mistral-NeMo-12B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/nv-mistralai",\n "tags": [\n "1.2",\n "1.2.2",\n "1",\n "latest"\n ],\n "latestTag": "1.2",\n "updatedDate": "2024-09-26T19:10:40.237Z"\n}',
          'mixtral-8x22b-instruct-v01':
            '{\n "name": "mixtral-8x22b-instruct-v01",\n "displayName": "Mixtral-8x22B-Instruct-v0.1",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mixtral-8x22B-Instruct-v0.1 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.2.2",\n "1",\n "1.2",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.2.2",\n "updatedDate": "2024-09-26T23:51:49.835Z"\n}',
          'mixtral-8x7b-instruct-v01':
            '{\n "name": "mixtral-8x7b-instruct-v01",\n "displayName": "Mixtral-8x7B-Instruct-v0.1",\n "shortDescription": "NVIDIA NIM for GPU accelerated Mixtral-8x7B-Instruct-v0.1 inference through OpenAI compatible APIs",\n "namespace": "nim/mistralai",\n "tags": [\n "1.2.1",\n "1",\n "1.2",\n "1.0.0",\n "latest"\n ],\n "latestTag": "1.2.1",\n "updatedDate": "2024-09-20T21:57:44.596Z"\n}',
          molmim:
            '{\n "name": "molmim",\n "displayName": "MolMIM",\n "shortDescription": "MolMIM is a transformer-based model developed by NVIDIA for controlled small molecule generation.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-09-23T18:19:56.199Z"\n}',
          'nemotron-4-340b-instruct':
            '{\n "name": "nemotron-4-340b-instruct",\n "displayName": "nemotron-4-340b-instruct",\n "shortDescription": "NVIDIA NIM for GPU accelerated Nemotron-4-340B-Instruct inference through OpenAI compatible APIs",\n "namespace": "nim/nvidia",\n "tags": [\n "latest",\n "1.1.2",\n "1.1",\n "1"\n ],\n "latestTag": "1.1.2",\n "updatedDate": "2024-08-29T18:33:09.615Z"\n}',
          'nv-embedqa-e5-v5':
            '{\n "name": "nv-embedqa-e5-v5",\n "displayName": "NVIDIA Retrieval QA E5 Embedding v5",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA E5 Embedding v5 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:37:35.717Z"\n}',
          'nv-embedqa-mistral-7b-v2':
            '{\n "name": "nv-embedqa-mistral-7b-v2",\n "displayName": "NVIDIA Retrieval QA Mistral 7B Embedding v2",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA Mistral 7B Embedding v2 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.1",\n "updatedDate": "2024-07-27T00:38:04.698Z"\n}',
          'nv-rerankqa-mistral-4b-v3':
            '{\n "name": "nv-rerankqa-mistral-4b-v3",\n "displayName": "NVIDIA Retrieval QA Mistral 4B Reranking v3",\n "shortDescription": "NVIDIA NIM for GPU accelerated NVIDIA Retrieval QA Mistral 4B Reranking v3 inference",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0.2",\n "1.0.1",\n "1.0.0"\n ],\n "latestTag": "1.0.2",\n "updatedDate": "2024-08-06T21:57:16.255Z"\n}',
          'parakeet-ctc-1.1b-asr':
            '{\n "name": "parakeet-ctc-1.1b-asr",\n "displayName": "ASR Parakeet CTC Riva 1.1b",\n "shortDescription": "RIVA ASR NIM delivers accurate English speech-to-text transcription and enables easy-to-use optimized ASR inference for large scale deployments.",\n "namespace": "nim/nvidia",\n "tags": [\n "1.0",\n "latest",\n "1.0.0"\n ],\n "latestTag": "1.0.0",\n "updatedDate": "2024-08-07T05:12:53.897Z"\n}',
          proteinmpnn:
            '{\n "name": "proteinmpnn",\n "displayName": "ProteinMPNN",\n "shortDescription": "Predicts amino acid sequences from 3D structure of proteins.",\n "namespace": "nim/ipd",\n "tags": [\n "1",\n "1.0",\n "1.0.0"\n ],\n "latestTag": "1",\n "updatedDate": "2024-08-27T01:52:07.955Z"\n}',
        },
        namespace: 'opendatahub',
        name: 'nvidia-nim-images-data',
      }),
    );
    projectDetails.visitSection('test-project', 'model-server');
    //projectDetails.findNimModelDeployButton().click();
    cy.findByTestId('deploy-button').click();
    //cy.contains('Deploy model with NVIDIA NIM').should('be.visible');

    // test that you can not submit on empty
    nimDeployModal.shouldBeOpen();
    nimDeployModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    nimDeployModal.findModelNameInput().type('Test Name');
    nimDeployModal.findNIMToDeploy().findSelectOption('meta-llama-2-13b-chat - latest').click();
    nimDeployModal.findSubmitButton().should('be.enabled');

    //nimDeployModal.findSubmitButton().click();

    //dry run request
    // cy.wait('@createInferenceService').then((interception) => {
    //   expect(interception.request.url).to.include('?dryRun=All');
    //   expect(interception.request.body).to.eql({
    //     apiVersion: 'serving.kserve.io/v1beta1',
    //     kind: 'InferenceService',
    //     metadata: {
    //       name: 'test-name',
    //       namespace: 'test-project',
    //       labels: { 'opendatahub.io/dashboard': 'true' },
    //       annotations: {
    //         'openshift.io/display-name': 'Test Name',
    //       },
    //     },
    //     spec: {
    //       predictor: {
    //         model: {
    //           modelFormat: { name: 'llama-2-13b-chat' },
    //           runtime: 'test-name',
    //           storage: { key: 'test-secret', path: 'test-model/' },
    //         },
    //         resources: {
    //           limits: { cpu: '2', memory: '8Gi' },
    //           requests: { cpu: '1', memory: '4Gi' },
    //         },
    //       },
    //     },
    //   });
    // });
    //
    // // Actual request
    // cy.wait('@createInferenceService').then((interception) => {
    //   expect(interception.request.url).not.to.include('?dryRun=All');
    // });
    //
    // cy.get('@createInferenceService.all').then((interceptions) => {
    //   expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
    // });
  });

//TODO: This work is done by Lokesh
  it('Check if the Nim Model UI is enabled', () => {
    // initIntercepts({
    //   templates: true,
    //   disableKServeConfig: false,
    //   disableModelConfig: false,
    //   disableNIMModelServing: false,
    // });

    initIntercepts();

    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.shouldBeEmptyState('Models', 'model-server', true);


    projectDetails.findServingPlatformLabel().should('exist');
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
