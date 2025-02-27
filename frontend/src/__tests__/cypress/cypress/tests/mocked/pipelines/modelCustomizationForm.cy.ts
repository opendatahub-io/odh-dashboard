/* eslint-disable camelcase */
import {
  judgeModelSection,
  modelCustomizationFormGlobal,
  teacherModelSection,
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
} from '~/__mocks__';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { HyperparameterFields } from '~/__tests__/cypress/cypress/types';

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
      [HyperparameterFields.SDG_SCALE_FACTOR]: {
        defaultValue: 30,
        description: 'SDG parameter. The total number of instructions to be generated.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.MAXIMUM_TOKENS_PER_ACCELERATOR]: {
        defaultValue: 5000,
        description:
          'Training parameter. Maximum tokens per gpu for each batch that will be handled in a single step.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.SDG_SAMPLE_SIZE]: {
        defaultValue: 1.0,
        description:
          'SDG parameter. Represents the sdg skills recipe sampling size as percentage in decimal form.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.DOUBLE,
      },
      [HyperparameterFields.TRAINING_WORKERS]: {
        defaultValue: 2,
        description: 'Training parameter. Number of nodes/workers to train on.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_1]: {
        defaultValue: 7,
        description: 'Training parameter for in Phase 1. Number of epochs to run training.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_2]: {
        defaultValue: 10,
        description: 'Training parameter for in Phase 2. Number of epochs to run training.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.BATCH_SIZE_PHASE_1]: {
        defaultValue: 128,
        description:
          'Training parameter for in Phase 1. The number of samples in a batch that the model should see before its parameters are updated.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.BATCH_SIZE_PHASE_2]: {
        defaultValue: 3840,
        description:
          'Training parameter for in Phase 2. The number of samples in a batch that the model should see before its parameters are updated.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.LEARNING_RATE_PHASE_1]: {
        defaultValue: 0.00002,
        description:
          "Training parameter for in Phase 1. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
        isOptional: false,
        parameterType: InputDefinitionParameterType.DOUBLE,
      },
      [HyperparameterFields.LEARNING_RATE_PHASE_2]: {
        defaultValue: 0.000006,
        description:
          "Training parameter for in Phase 2. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
        isOptional: false,
        parameterType: InputDefinitionParameterType.DOUBLE,
      },
      [HyperparameterFields.WARMUP_STEPS_PHASE_1]: {
        defaultValue: 1000,
        description:
          'Training parameter for in Phase 1. The number of steps a model should go through before reaching the full learning rate. We start at 0 and linearly climb up to train_learning_rate.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.WARMUP_STEPS_PHASE_2]: {
        defaultValue: 1000,
        description:
          'Training parameter for in Phase 2. The number of steps a model should go through before reaching the full learning rate. We start at 0 and linearly climb up to train_learning_rate.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.MAXIMUM_BATCH_LENGTH]: {
        defaultValue: 5000,
        description:
          'SDG parameter. Maximum tokens per gpu for each batch that will be handled in a single step.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.TRAINING_SEED]: {
        defaultValue: 42,
        description: 'Training parameter. Random seed for initializing training.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.QUESTION_ANSWER_PAIRS]: {
        defaultValue: 5,
        description:
          'Final model evaluation parameter for MMLU. Number of question-answer pairs provided in the context preceding the question used for evaluation.',
        isOptional: false,
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      [HyperparameterFields.EVALUATION_WORKERS]: {
        defaultValue: 'auto',
        description:
          "Final model evaluation parameter for MT Bench Branch. Number of workers to use for evaluation with mt_bench or mt_bench_branch. Must be a positive integer or 'auto'.",
        isOptional: false,
        parameterType: InputDefinitionParameterType.STRING,
      },
      [HyperparameterFields.EVALUATION_BATCH_SIZE]: {
        defaultValue: 'auto',
        description:
          "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
        isOptional: false,
        parameterType: InputDefinitionParameterType.STRING,
      },
    },
  },
);

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
    modelCustomizationFormGlobal.visit(projectName);
    cy.wait('@getAllPipelines');
    cy.wait('@getAllPipelineVersions');
    teacherModelSection.findEndpointInput().type('http://test.com');
    teacherModelSection.findModelNameInput().type('test');
    judgeModelSection.findEndpointInput().type('http://test.com');
    judgeModelSection.findModelNameInput().type('test');
    modelCustomizationFormGlobal.findSimpleRunButton().click();
    modelCustomizationFormGlobal.findSubmitButton().should('not.be.disabled');
    modelCustomizationFormGlobal.findExpandableSectionButton().click();
    modelCustomizationFormGlobal
      .findNumericInputPlusButton('sdg_scale_factor-numeric-field')
      .click();
    modelCustomizationFormGlobal
      .findLongNumberInput('Learning rate (phase 1)-long-number-field')
      .clear()
      .type('0.01');
    modelCustomizationFormGlobal
      .findRadioInput('final_eval_batch_size-exact-evaluation-field')
      .click();
    modelCustomizationFormGlobal
      .findNumericInputPlusButton('final_eval_batch_size-numeric-field')
      .click();
    modelCustomizationFormGlobal.findSubmitButton().should('not.be.disabled');
  });
  it('Should not submit', () => {
    initIntercepts({});
    cy.interceptOdh(
      'GET /apis/v2beta1/pipelines/names/:pipelineName',
      {
        path: { pipelineName: 'instructlab' },
      },
      buildMockPipeline(invalidMockPipeline),
    ).as('getAllPipelines');
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
    cy.wait('@getAllPipelines');
    modelCustomizationFormGlobal.findSubmitButton().should('not.exist');
  });
});

type HandlersProps = {
  disableFineTuning?: boolean;
  isEmptyProject?: boolean;
};

export const initIntercepts = (
  { disableFineTuning = false, isEmptyProject }: HandlersProps = { isEmptyProject: false },
): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFineTuning,
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
    buildMockPipelineVersions([initialMockPipelineVersion]),
  );
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
    initialMockPipelineVersion,
  );

  cy.interceptOdh(
    'GET /apis/v2beta1/pipelines/names/:pipelineName',
    {
      path: { pipelineName: 'instructlab' },
    },
    buildMockPipeline(initialMockPipeline),
  ).as('getAllPipelines');

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

  cy.interceptOdh(
    'GET /apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: { pipelineId: 'instructlab' },
    },
    buildMockPipelines([initialMockPipelineVersion]),
  ).as('getAllPipelineVersions');
};
