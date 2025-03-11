/* eslint-disable camelcase */
import { mockIlabPipelineVersionParameters } from '~/__mocks__/mockIlabPipelineVersionParameters';
import {
  judgeModelSection,
  modelCustomizationFormGlobal,
  teacherModelSection,
  taxonomySection,
  hardwareSection,
} from '~/__tests__/cypress/cypress/pages/pipelines/modelCustomizationForm';
import {
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
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
  StorageClassModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { TolerationEffect, TolerationOperator } from '~/types';

const projectName = 'test-project-name-2';
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
  // TODO: update this test once the tunning button is available
  it('Should submit', () => {
    initIntercepts({});
    modelCustomizationFormGlobal.visit(projectName);
    cy.wait('@getIlabPipeline');
    cy.wait('@getPipelineVersions');
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

    modelCustomizationFormGlobal.findSubmitButton().should('be.disabled');
    modelCustomizationFormGlobal.findSimpleRunButton().click();
    modelCustomizationFormGlobal.findExpandableSectionButton().click();
    modelCustomizationFormGlobal.findNumericInputPlusButton('sdg_scale_factor').click();
    modelCustomizationFormGlobal.findNumericInputPlusButton('train_num_workers').click();
    modelCustomizationFormGlobal
      .findLongNumberInput('train_learning_rate_phase_1-long-number-field')
      .clear()
      .type('0.01');
    modelCustomizationFormGlobal
      .findRadioInput('final_eval_batch_size-exact-evaluation-field')
      .click();
    modelCustomizationFormGlobal.findNumericInputPlusButton('final_eval_batch_size').click();
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
});

type HandlersProps = {
  disableFineTuning?: boolean;
  disableHardwareProfiles?: boolean;
  isEmptyProject?: boolean;
  isValid?: boolean;
};

export const initIntercepts = (
  {
    disableFineTuning = false,
    disableHardwareProfiles = false,
    isEmptyProject,
    isValid = true,
  }: HandlersProps = {
    isEmptyProject: false,
  },
): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFineTuning,
      disableHardwareProfiles,
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
