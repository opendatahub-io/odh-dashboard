/* eslint-disable camelcase */
import { modelCustomizationFormGlobal } from '~/__tests__/cypress/cypress/pages/pipelines/modelCustomizationForm';
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

const projectName = 'test-project-name-2';
const invalidMockPipeline = buildMockPipeline();
const initialMockPipeline = buildMockPipeline({
  display_name: 'instructlab',
  pipeline_id: 'instructlab',
});
const initialMockPipelineVersion = buildMockPipelineVersion({
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
  it('Should submit', () => {
    initIntercepts({});
    modelCustomizationFormGlobal.visit(projectName);
    cy.wait('@getAllPipelines');
    cy.wait('@getAllPipelineVersions');
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
    modelCustomizationFormGlobal.findSubmitButton().should('be.disabled');
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
