/* eslint-disable camelcase */
import {
  artifactDetails,
  artifactsGlobal,
  artifactsTable,
} from '#~/__tests__/cypress/cypress/pages/pipelines/artifacts';
import {
  mockGetArtifactsById,
  mockGetArtifactsResponse,
  mockedArtifactsResponse,
} from '#~/__mocks__/mlmd/mockGetArtifacts';
import {
  buildMockPipeline,
  buildMockRunKF,
  mockMetricsVisualizationRun,
  mockMetricsVisualizationVersion,
} from '#~/__mocks__';
import { pipelineRunDetails } from '#~/__tests__/cypress/cypress/pages/pipelines';
import { mockArtifactStorage } from '#~/__mocks__/mockArtifactStorage';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';
import { configIntercept, dspaIntercepts, projectsIntercept } from './intercepts';
import { initMlmdIntercepts } from './mlmdUtils';

const projectName = 'test-project-name';

const mockPipeline = buildMockPipeline({
  pipeline_id: 'metrics-pipeline',
  display_name: 'metrics-pipeline',
});

const mockRuns = buildMockRunKF({
  display_name: 'Test run',
  run_id: 'test-run',
  experiment_id: 'test-experiment-1',
  created_at: '2024-02-10T00:00:00Z',
  state: RuntimeStateKF.SUCCEEDED,
});

describe('Artifacts', () => {
  beforeEach(() => {
    initIntercepts();
  });

  describe('table', () => {
    it('shows empty state', () => {
      artifactsTable.mockGetArtifacts(projectName, mockGetArtifactsResponse({ artifacts: [] }));
      artifactsGlobal.visit(projectName);
      artifactsTable.findEmptyState().should('be.visible');
    });

    it('renders row data', () => {
      artifactsTable.mockGetArtifacts(
        projectName,
        mockGetArtifactsResponse(mockedArtifactsResponse),
      );
      artifactsGlobal.visit(projectName);

      const scalarMetricsRow = artifactsTable.getRowByName('scalar metrics');
      scalarMetricsRow.findId().should('have.text', '1');
      scalarMetricsRow.findType().should('have.text', 'system.Metrics');
      scalarMetricsRow.findUri().should('have.text', '-');
      scalarMetricsRow.findCreated().should('have.text', '23 Jan 2021');

      const datasetRow = artifactsTable.getRowByName('dataset');
      datasetRow.findId().should('have.text', '2');
      datasetRow.findType().should('have.text', 'system.Dataset');
      datasetRow.findUri().should('have.text', 's3://dataset-uri');
      datasetRow.findCreated().should('have.text', '23 Jan 2021');

      const confidenceMetricsRow = artifactsTable.getRowByName('confidence metrics');
      confidenceMetricsRow.findId().should('have.text', '3');
      confidenceMetricsRow.findType().should('have.text', 'system.ClassificationMetrics');
      confidenceMetricsRow.findUri().should('have.text', '-');
      confidenceMetricsRow.findCreated().should('have.text', '23 Jan 2021');

      const confusionMatrixRow = artifactsTable.getRowByName('confusion matrix');
      confusionMatrixRow.findId().should('have.text', '4');
      confusionMatrixRow.findType().should('have.text', 'system.ClassificationMetrics');
      confusionMatrixRow.findUri().should('have.text', '-');
      confusionMatrixRow.findCreated().should('have.text', '23 Jan 2021');
    });

    it('navigates to details page on Artifact name click', () => {
      artifactsGlobal.visit(projectName);
      artifactsTable.mockGetArtifacts(
        projectName,
        mockGetArtifactsResponse(mockedArtifactsResponse),
      );
      artifactsGlobal.visit(projectName);
      artifactsTable.getRowByName('scalar metrics').findName().find('a').click();

      cy.url().should('include', `/artifacts/${projectName}/1`);
    });

    it('it has label Registered for fine tune artifact', () => {
      artifactsTable.mockGetArtifacts(
        projectName,
        mockGetArtifactsResponse(mockedArtifactsResponse),
      );
      artifactsGlobal.visit(projectName);
      artifactsTable
        .getRowByName('registered model metrics')
        .findLabel()
        .should('have.text', 'Registered');
    });

    describe('filters data by', () => {
      beforeEach(() => {
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse(mockedArtifactsResponse),
          3,
        );
        artifactsGlobal.visit(projectName);
        artifactsTable.findRows().should('have.length', 7);
      });

      it('name', () => {
        artifactsGlobal.selectFilterByName('Artifact');
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse({
            artifacts: mockedArtifactsResponse.artifacts.filter(
              (mockArtifact) =>
                Object.entries(mockArtifact.customProperties).length !== 0 &&
                mockArtifact.customProperties.display_name.stringValue?.includes('metrics'),
            ),
          }),
          1,
        );
        artifactsGlobal.findFilterFieldInput().type('metrics');
        artifactsTable.findRows().should('have.length', 4);
        artifactsTable.getRowByName('scalar metrics').find().should('be.visible');
        artifactsTable.getRowByName('confidence metrics').find().should('be.visible');
      });

      it('ID', () => {
        artifactsGlobal.selectFilterByName('ID');
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse({
            artifacts: mockedArtifactsResponse.artifacts.filter(
              (mockArtifact) => mockArtifact.id === 4,
            ),
          }),
          1,
        );
        artifactsGlobal.findFilterFieldInput().type('4');
        artifactsTable.findRows().should('have.length', 1);
        artifactsTable.getRowByName('confusion matrix').find().should('be.visible');
      });

      it('Type', () => {
        artifactsGlobal.selectFilterByName('Type');
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse({
            artifacts: mockedArtifactsResponse.artifacts.filter(
              (mockArtifact) => mockArtifact.type === 'system.Metrics',
            ),
          }),
          1,
        );
        artifactsGlobal.findFilterField().click();
        artifactsGlobal.selectFilterType('system.Metrics');
        artifactsTable.findRows().should('have.length', 2);
        artifactsTable.getRowByName('scalar metrics').find().should('be.visible');
      });
    });
  });

  describe('details', () => {
    it('shows empty state for properties and custom properties', () => {
      artifactDetails.mockGetArtifactById(
        projectName,
        mockGetArtifactsById({
          artifacts: [mockedArtifactsResponse.artifacts[5]],
          artifactTypes: [],
        }),
      );
      artifactDetails.visit(projectName, '(No name)', '7');
      artifactDetails.findPropSection().should('contain.text', 'No properties');
      artifactDetails.findCustomPropSection().should('contain.text', 'No custom properties');
    });

    it('shows Overview tab content', () => {
      artifactDetails.mockGetArtifactById(
        projectName,
        mockGetArtifactsById({
          artifacts: [mockedArtifactsResponse.artifacts[0]],
          artifactTypes: [],
        }),
      );
      artifactDetails.visit(projectName, 'metrics', '1');
      artifactDetails.findDatasetItemByLabel('URI').next().should('include.text', '-');
      artifactDetails.findCustomPropItemByLabel('accuracy').next().should('have.text', '92');
      artifactDetails
        .findCustomPropItemByLabel('display_name')
        .next()
        .should('have.text', 'scalar metrics');
      artifactDetails.findReferenceTable().should('exist');
      artifactDetails.findPipelineLink('runs/details/test-run');
      artifactDetails.findExecutionLink('execution/211');
      artifactDetails.findExecutionLink('execution/211').click();
      verifyRelativeURL('/executions/test-project-name/211');
    });

    it('Registered models section', () => {
      artifactDetails.mockGetArtifactById(
        projectName,
        mockGetArtifactsById({
          artifacts: [mockedArtifactsResponse.artifacts[6]],
          artifactTypes: [],
        }),
      );
      artifactDetails.visit(projectName, 'registered model metrics', '8');
      artifactDetails
        .findRegisteredModelSection()
        .should('have.text', 'model (1) in model-registry registry');
      artifactDetails
        .findModelVersionLink()
        .should('eq', '/modelRegistry/model-registry/registeredModels/1/versions/1');
    });
  });

  describe('artifact in pipeline run details page', () => {
    it('url is clickable', () => {
      pipelineRunDetails.visit(projectName, mockMetricsVisualizationRun.run_id);

      pipelineRunDetails.findTaskNode('markdown-visualization').click();

      pipelineRunDetails
        .findArtifactItems('markdown_artifact')
        .should(
          'contain.text',
          's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
        )
        .click()
        .then(() =>
          cy.get('a').each(($el) => {
            cy.wrap($el).should('have.attr', 'href').and('not.be.empty');
          }),
        );
    });
  });
  describe('Pipeline run visualization tab', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/artifacts/:artifactId',
        {
          query: { view: 'RENDER' },
          path: { namespace: projectName, serviceName: 'dspa', artifactId: '18' },
        },
        mockArtifactStorage({ namespace: projectName, artifactId: '18' }),
      );
      cy.intercept(
        'GET',
        'https://test.s3.dualstack.us-east-1.amazonaws.com/metrics-visualization-pipeline/5e873c64-39fa-4dd4-83db-eff0cdd1e274/html-visualization/html_artifact?X-Amz-Algorithm=AWS4-HMAC-SHA256\u0026X-Amz-Credential=AKIAYQPE7PSILMBBLXMO%2F20240808%2Fus-east-1%2Fs3%2Faws4_request\u0026X-Amz-Date=20240808T070034Z\u0026X-Amz-Expires=15\u0026X-Amz-SignedHeaders=host\u0026response-content-disposition=attachment%3B%20filename%3D%22%22\u0026X-Amz-Signature=de39ee684dd606e75da3b07c1b9f0820f7442ea7a037ae1bffccea9e33610ea9',
        '<html>helloWorld</html>',
      );
      initMlmdIntercepts(projectName);
    });

    it('check for visualization', () => {
      pipelineRunDetails.visit(projectName, mockMetricsVisualizationRun.run_id);
      pipelineRunDetails.findArtifactNode('html-visualization.html_artifact').click();
      const artifactDrawer = pipelineRunDetails.findArtifactRightDrawer();
      artifactDrawer.findVisualizationTab().click();
      artifactDrawer.findIframeContent().should('have.text', 'helloWorld');
    });
  });
});

it('should show an error icon when pipeline run fails to run', () => {
  initIntercepts(true);

  artifactDetails.mockGetArtifactById(
    projectName,
    mockGetArtifactsById({
      artifacts: [mockedArtifactsResponse.artifacts[0]],
      artifactTypes: [],
    }),
  );
  artifactDetails.visit(projectName, 'metrics', '1');
  artifactDetails.shouldFailToLoadRun();
});

export const initIntercepts = (isRunError = false): void => {
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);
  initMlmdIntercepts(projectName);
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: mockPipeline.pipeline_id,
      },
    },
    mockPipeline,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: mockPipeline.pipeline_id,
        pipelineVersionId: 'metrics-pipeline-version',
      },
    },
    mockMetricsVisualizationVersion,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        runId: mockRuns.run_id,
      },
    },
    isRunError ? { statusCode: 404 } : mockRuns,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
    {
      path: { namespace: projectName, serviceName: 'dspa', runId: 'test-metrics-pipeline-run' },
    },
    mockMetricsVisualizationRun,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/artifacts/:artifactId',
    {
      query: { view: 'DOWNLOAD' },
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        artifactId: '16',
      },
    },
    mockArtifactStorage({
      namespace: projectName,
      artifactId: '16',
      storage_path:
        'iris-training-pipeline/caf9116b-501e-491c-88e3-7772ba2b3334/create-dataset/iris_dataset',
      uri: 's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
      download_url:
        'http://test-bucket.s3.dualstack.ap-south.amazonaws.com/metrics-visualization-pipeline',
      artifact_type: 'system.Dataset',
      artifact_size: '5098',
    }),
  );
};
