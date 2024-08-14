/* eslint-disable camelcase */
import {
  artifactDetails,
  artifactsGlobal,
  artifactsTable,
} from '~/__tests__/cypress/cypress/pages/pipelines/artifacts';
import {
  mockGetArtifactsById,
  mockGetArtifactsResponse,
  mockedArtifactsResponse,
} from '~/__mocks__/mlmd/mockGetArtifacts';
import {
  buildMockPipelineV2,
  mockDashboardConfig,
  mockMetricsVisualizationRun,
  mockMetricsVisualizationVersion,
} from '~/__mocks__';
import { mockArtifactStorage } from '~/__mocks__/mockArtifactStorage';
import { pipelineRunDetails } from '~/__tests__/cypress/cypress/pages/pipelines';
import { configIntercept, dspaIntercepts, projectsIntercept } from './intercepts';
import { initMlmdIntercepts } from './mlmdUtils';

const projectName = 'test-project-name';

const mockPipeline = buildMockPipelineV2({
  pipeline_id: 'metrics-pipeline',
  display_name: 'metrics-pipeline',
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
      scalarMetricsRow.findUri().should('have.text', 's3://scalar-metrics-uri');
      scalarMetricsRow.findCreated().should('have.text', '23 Jan 2021');

      const datasetRow = artifactsTable.getRowByName('dataset');
      datasetRow.findId().should('have.text', '2');
      datasetRow.findType().should('have.text', 'system.Dataset');
      datasetRow.findUri().should('have.text', 's3://dataset-uri');
      datasetRow.findCreated().should('have.text', '23 Jan 2021');

      const confidenceMetricsRow = artifactsTable.getRowByName('confidence metrics');
      confidenceMetricsRow.findId().should('have.text', '3');
      confidenceMetricsRow.findType().should('have.text', 'system.ClassificationMetrics');
      confidenceMetricsRow.findUri().should('have.text', 's3://confidence-metrics-uri');
      confidenceMetricsRow.findCreated().should('have.text', '23 Jan 2021');

      const confusionMatrixRow = artifactsTable.getRowByName('confusion matrix');
      confusionMatrixRow.findId().should('have.text', '4');
      confusionMatrixRow.findType().should('have.text', 'system.ClassificationMetrics');
      confusionMatrixRow.findUri().should('have.text', 's3://confusion-matrix-uri');
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

    describe('filters data by', () => {
      beforeEach(() => {
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse(mockedArtifactsResponse),
          3,
        );
        artifactsGlobal.visit(projectName);
        artifactsTable.findRows().should('have.length', 5);
      });

      it('name', () => {
        artifactsGlobal.selectFilterByName('Artifact');
        artifactsTable.mockGetArtifacts(
          projectName,
          mockGetArtifactsResponse({
            artifacts: mockedArtifactsResponse.artifacts.filter((mockArtifact) =>
              mockArtifact.customProperties.display_name.stringValue?.includes('metrics'),
            ),
          }),
          1,
        );
        artifactsGlobal.findFilterFieldInput().type('metrics');
        artifactsTable.findRows().should('have.length', 3);
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
        artifactsTable.findRows().should('have.length', 1);
        artifactsTable.getRowByName('scalar metrics').find().should('be.visible');
      });
    });
  });

  describe('details', () => {
    it('shows Overview tab content', () => {
      artifactDetails.mockGetArtifactById(
        projectName,
        mockGetArtifactsById({
          artifacts: [mockedArtifactsResponse.artifacts[0]],
          artifactTypes: [],
        }),
      );
      artifactDetails.visit(projectName, 'metrics', '1');
      artifactDetails
        .findDatasetItemByLabel('URI')
        .next()
        .should('include.text', 's3://scalar-metrics-uri');
      artifactDetails.findCustomPropItemByLabel('accuracy').next().should('have.text', '92');
      artifactDetails
        .findCustomPropItemByLabel('display_name')
        .next()
        .should('have.text', 'scalar metrics');
    });
  });

  describe('artifact in pipeline run details page', () => {
    it('only url text when both artifactsAPI and s3Endpoint are disabled', () => {
      initPipelineTopologyIntercepts({ disableArtifactsAPI: true, disableS3Endpoint: true });
      pipelineRunDetails.visit(
        projectName,
        mockPipeline.pipeline_id,
        mockMetricsVisualizationVersion.pipeline_version_id,
        mockMetricsVisualizationRun.run_id,
      );

      pipelineRunDetails.findTaskNode('markdown-visualization').click();

      pipelineRunDetails
        .findArtifactItems('markdown_artifact')
        .should(
          'contain.text',
          's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
        );
    });

    it('url is clickable when artifact api is enabled', () => {
      initPipelineTopologyIntercepts({ disableArtifactsAPI: false, disableS3Endpoint: false });
      pipelineRunDetails.visit(
        projectName,
        mockPipeline.pipeline_id,
        mockMetricsVisualizationVersion.pipeline_version_id,
        mockMetricsVisualizationRun.run_id,
      );

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
      initPipelineTopologyIntercepts({});
      cy.interceptOdh(
        'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/artifacts/:artifactId',
        {
          query: { view: 'DOWNLOAD' },
          path: { namespace: projectName, serviceName: 'dspa', artifactId: 18 },
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
      pipelineRunDetails.visit(
        projectName,
        mockPipeline.pipeline_id,
        mockMetricsVisualizationVersion.pipeline_version_id,
        mockMetricsVisualizationRun.run_id,
      );
      pipelineRunDetails.findArtifactNode('html-visualization.html_artifact').click();
      const artifactDrawer = pipelineRunDetails.findArtifactRightDrawer();
      artifactDrawer.findVisualizationTab().click();
      artifactDrawer.findIframeContent().should('have.text', 'helloWorld');
    });
  });
});

type InitPipelineTopologyInterceptsType = {
  disableArtifactsAPI?: boolean;
  disableS3Endpoint?: boolean;
};

const initPipelineTopologyIntercepts = ({
  disableArtifactsAPI = false,
  disableS3Endpoint = false,
}: InitPipelineTopologyInterceptsType) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableArtifactsAPI,
      disableS3Endpoint,
    }),
  );
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
      path: { namespace: projectName, serviceName: 'dspa', runId: 'test-metrics-pipeline-run' },
    },
    mockMetricsVisualizationRun,
  );
  initMlmdIntercepts(projectName);
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/artifacts/:artifactId',
    {
      query: { view: 'DOWNLOAD' },
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        artifactId: 16,
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

export const initIntercepts = (): void => {
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);
};
