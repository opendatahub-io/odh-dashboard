import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  AcceleratorProfileModel,
  ConfigMapModel,
  NotebookModel,
  PodModel,
  ProjectModel,
  PVCModel,
  RoleBindingModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { mockNotebookK8sResource, mockRouteK8sResource, mockStorageClasses } from '~/__mocks__';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockConsoleLinks } from '~/__mocks__/mockConsoleLinks';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';

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
});
