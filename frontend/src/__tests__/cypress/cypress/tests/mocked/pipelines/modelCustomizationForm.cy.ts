/* eslint-disable camelcase */
import { mockIlabPipelineVersionParameters } from '~/__mocks__/mockIlabPipelineVersionParameters';
import {
  judgeModelSection,
  modelCustomizationFormGlobal,
  teacherModelSection,
  taxonomySection,
  hardwareSection,
  baseModelSection,
} from '~/__tests__/cypress/cypress/pages/pipelines/modelCustomizationForm';
import {
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockDscStatus,
  mockK8sResourceList,
  mockModelArtifactList,
  mockModelRegistryService,
  mockModelVersion,
  mockModelVersionList,
  mockProjectK8sResource,
  mockRegisteredModel,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '~/__mocks__';
import {
  DataSciencePipelineApplicationModel,
  HardwareProfileModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  ServiceModel,
  StorageClassModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { TolerationEffect, TolerationOperator } from '~/types';

const projectName = 'test-project-name-2';
const MODEL_REGISTRY_API_VERSION = 'v1alpha3';
const invalidMockPipeline = buildMockPipeline();
const initialMockPipeline = buildMockPipeline({
  display_name: 'instructlab',
  pipeline_id: 'instructlab',
});
const initialMockPipelineVersion = buildMockPipelineVersion(
  {
    pipeline_id: initialMockPipeline.pipeline_id,
  },
  {
    parameters: {
      ...mockIlabPipelineVersionParameters,
    },
  },
);

const invalidMockIlabPipeline = buildMockPipelineVersion({
  pipeline_id: initialMockPipeline.pipeline_id,
});

const visitModelVersionDetails = ({
  serviceName,
  versionNo,
}: {
  serviceName: string;
  versionNo: string;
}) => {
  cy.visit(`/modelRegistry/${serviceName}/registeredModels/1/versions/${versionNo}/details`);
  cy.wait('@getRegisteredModel');
  cy.wait('@getModelVersion');
  cy.wait('@getModelVersions');
  cy.findByTestId('app-page-title').contains('Version 1');
  cy.findByTestId('lab-tune-button').click();
  cy.findByTestId('start-run-modal').should('exist'); // Verify the start run modal appears
  cy.findByTestId('project-selector-toggle').click(); // Select a project in the modal
  cy.findByTestId('project-selector-menu').findByText('Test Project 2').click();
  cy.findByTestId('modal-submit-button').should('not.be.disabled').click(); // Ensure the Continue button is enabled and click it
};

describe('Model Customization Form', () => {
  it('Empty state', () => {
    initIntercepts({ isEmptyProject: true });
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));
    modelCustomizationFormGlobal.visit(projectName, true);
    modelCustomizationFormGlobal.findEmptyState().should('exist');
  });
  it('Invalid state', () => {
    initIntercepts({});
    modelCustomizationFormGlobal.invalidVisit();
    modelCustomizationFormGlobal.findEmptyState().should('exist');
  });

  it('Should submit', () => {
    initIntercepts({});
    setupModelRegistryIntercepts({ modelRegistryServiceName: 'modelregistry-sample' });
    visitModelVersionDetails({ serviceName: 'modelregistry-sample', versionNo: '1' });
    cy.wait('@getIlabPipeline');
    cy.wait('@getPipelineVersions');
    baseModelSection.editInlineText('http://test.com');
    teacherModelSection.findEndpointInput().type('http://test.com');
    teacherModelSection.findModelNameInput().type('test');
    judgeModelSection.findEndpointInput().type('http://test.com');
    judgeModelSection.findModelNameInput().type('test');
    taxonomySection.findTaxonomyUrl().type('http://github.git');
    taxonomySection.findSshKeyRadio().check();
    taxonomySection.findTaxonomySShKey().type('test');
    taxonomySection.findUsernameAndTokenRadio().check();
    taxonomySection.findTaxonomyUsername().fill('test');
    taxonomySection.findTaxonomyToken().fill('test');
    hardwareSection.selectProfile(
      'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi; Nvidia.com/gpu: Request = 2; Limit = 2',
    );
    hardwareSection.findTrainingNodePlusButton().click();

    modelCustomizationFormGlobal.findSubmitButton().should('not.be.disabled');
    modelCustomizationFormGlobal.findSimpleRunButton().click();
  });

  it('Alert message when ilab pipeline required parameters are absent', () => {
    initIntercepts({ isValid: false });
    modelCustomizationFormGlobal.visit(projectName);
    cy.wait('@getIlabPipeline');
    cy.wait('@getPipelineVersions');

    modelCustomizationFormGlobal.findErrorMessage().should('exist');
  });
  it('Should not submit', () => {
    initIntercepts({});
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/names/:pipelineName',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineName: 'instructlab',
        },
      },
      buildMockPipeline(invalidMockPipeline),
    ).as('getIlabPipeline');
    modelCustomizationFormGlobal.visit(projectName);
    cy.wait('@getIlabPipeline');
    modelCustomizationFormGlobal.findSubmitButton().should('not.exist');
  });

  it('should navigate to the model customization page on clicking cancel when state is not available', () => {
    initIntercepts({});
    modelCustomizationFormGlobal.visit(projectName);
    modelCustomizationFormGlobal.findCancelButton().click();
    cy.url().should('include', `/modelCustomization`);
  });

  it('should navigate to Model Customization from Model Registry via LabTune button and back on cancel button when state is available', () => {
    initIntercepts({});
    setupModelRegistryIntercepts({ modelRegistryServiceName: 'modelregistry-sample' });
    visitModelVersionDetails({ serviceName: 'modelregistry-sample', versionNo: '1' });
    cy.url().should('include', `/modelCustomization/fine-tune/${projectName}`);
    modelCustomizationFormGlobal.findCancelButton().click();
  });
});

type HandlersProps = {
  disableFineTuning?: boolean;
  disableHardwareProfiles?: boolean;
  isEmptyProject?: boolean;
  isValid?: boolean;
  disableModelRegistry?: boolean;
};

type ModelRegistryProps = {
  modelRegistryServiceName: string;
};

export const initIntercepts = (
  {
    disableFineTuning = false,
    disableHardwareProfiles = false,
    isEmptyProject,
    isValid = true,
    disableModelRegistry = false,
  }: HandlersProps = {
    isEmptyProject: false,
  },
): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFineTuning,
      disableHardwareProfiles,
      disableModelRegistry,
    }),
  );
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList(
      isEmptyProject
        ? []
        : [
            mockDataSciencePipelineApplicationK8sResource({
              namespace: projectName,
            }),
          ],
    ),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      dspaSecretName: 'aws-connection-test',
    }),
  );
  cy.interceptK8s(
    {
      model: SecretModel,
      ns: projectName,
    },
    mockSecretK8sResource({
      s3Bucket: 'c2RzZA==',
      namespace: projectName,
      name: 'aws-connection-test',
    }),
  );
  cy.interceptK8s(
    'GET',
    SecretModel,
    mockSecretK8sResource({ name: 'ds-pipeline-config', namespace: projectName }),
  ).as('deletePipelineConfig');
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: 'test-project-name' }),
      mockProjectK8sResource({ k8sName: `${projectName}`, displayName: 'Test Project 2' }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([initialMockPipeline]),
  ).as('getPipelines');

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    buildMockPipelineVersions(isValid ? [initialMockPipelineVersion] : [invalidMockIlabPipeline]),
  ).as('getPipelineVersions');

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    initialMockPipeline,
  );
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockHardwareProfile({
        name: 'small-profile',
        displayName: 'Small Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '4Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'Nvidia.com/gpu',
            identifier: 'nvidia.com/gpu',
            minCount: '2',
            maxCount: '4',
            defaultCount: '2',
          },
        ],
        tolerations: [
          {
            effect: TolerationEffect.NO_SCHEDULE,
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
          },
        ],
        nodeSelector: {},
      }),
      mockHardwareProfile({
        name: 'medium-profile',
        displayName: 'Medium Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '4Gi',
            defaultCount: '2Gi',
          },
          {
            displayName: 'Nvidia.com/gpu',
            identifier: 'nvidia.cpm/gpu',
            minCount: '2',
            maxCount: '4',
            defaultCount: '2',
          },
        ],
        tolerations: [
          {
            effect: TolerationEffect.NO_SCHEDULE,
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
          },
        ],
        nodeSelector: {},
      }),
    ]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
        pipelineVersionId: initialMockPipelineVersion.pipeline_version_id,
      },
    },
    isValid ? initialMockPipelineVersion : invalidMockIlabPipeline,
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/names/:pipelineName',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineName: 'instructlab',
      },
    },
    buildMockPipeline(initialMockPipeline),
  ).as('getIlabPipeline');
};

const setupModelRegistryIntercepts = ({ modelRegistryServiceName }: ModelRegistryProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
        'data-science-pipelines-operator': true,
      },
    }),
  );

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: modelRegistryServiceName })]),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: modelRegistryServiceName,
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockRegisteredModel({}),
  ).as('getRegisteredModel');

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: modelRegistryServiceName,
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({
      items: [
        mockModelVersion({
          name: 'Version 1',
          author: 'Author 1',
          registeredModelId: '1',
          id: '1',
        }),
      ],
    }),
  ).as('getModelVersions');

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: modelRegistryServiceName,
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelVersion({ id: '1', name: 'Version 1' }),
  ).as('getModelVersion');

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: modelRegistryServiceName,
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelArtifactList({}),
  ).as('getModelArtifacts');
};
