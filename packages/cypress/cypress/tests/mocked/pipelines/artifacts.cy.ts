/* eslint-disable camelcase */
import {
  mockGetArtifactsById,
  mockGetArtifactsResponse,
  mockedArtifactsResponse,
} from '@odh-dashboard/internal/__mocks__/mlmd/mockGetArtifacts';
import {
  buildMockPipeline,
  buildMockRunKF,
  mockMetricsVisualizationRun,
  mockMetricsVisualizationVersion,
} from '@odh-dashboard/internal/__mocks__';
import { mockArtifactStorage } from '@odh-dashboard/internal/__mocks__/mockArtifactStorage';
import { RuntimeStateKF } from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { configIntercept, dspaIntercepts, projectsIntercept } from './intercepts';
import { initMlmdIntercepts } from './mlmdUtils';
import { verifyRelativeURL } from '../../../utils/url';
import { pipelineRunDetails } from '../../../pages/pipelines';
import {
  artifactDetails,
  artifactsGlobal,
  artifactsTable,
} from '../../../pages/pipelines/artifacts';

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
    // CONVERTED to Jest: frontend/src/pages/pipelines/global/experiments/artifacts/__tests__/ArtifactsList.spec.tsx
    // - "shows empty state" -> ArtifactsList.spec.tsx "should show empty state when there are no artifacts"

    // CONVERTED to Jest: frontend/src/pages/pipelines/global/experiments/artifacts/__tests__/ArtifactsTable.spec.tsx
    // - "renders row data" -> ArtifactsTable.spec.tsx "renders artifacts table with data" (already existed)

    it('navigates to details page on Artifact name click', () => {
      artifactsGlobal.visit(projectName);
      artifactsTable.mockGetArtifacts(
        projectName,
        mockGetArtifactsResponse(mockedArtifactsResponse),
      );
      artifactsGlobal.visit(projectName);
      artifactsTable.getRowByName('scalar metrics').findName().find('a').click();

      cy.url().should('include', `/develop-train/pipelines/artifacts/${projectName}/1`);
    });

    // CONVERTED to Jest: frontend/src/pages/pipelines/global/experiments/artifacts/__tests__/ArtifactsTableRow.spec.tsx
    // - "it has label Registered for fine tune artifact" -> ArtifactsTableRow.spec.tsx "should show Registered label for artifact with registered model"

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
    // CONVERTED to Jest: frontend/src/pages/pipelines/global/experiments/artifacts/__tests__/ArtifactDetails.spec.tsx
    // - "renders the project navigator link" -> ArtifactDetails.spec.tsx breadcrumb tests
    // - "shows empty state for properties and custom properties" -> ArtifactDetails.spec.tsx "should show empty state for properties and custom properties"
    // - "Registered models section" -> ArtifactDetails.spec.tsx "should show Registered models section"
    // - "should show an error icon when pipeline run fails to run" -> ArtifactDetails.spec.tsx "should show an error icon when pipeline run fails to load"

    // CONVERTED to Jest: frontend/src/utilities/__tests__/v2Redirect.spec.tsx
    // - "redirect from v2 to v3 route" -> covered by v2Redirect.spec.tsx wildcard redirect tests

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
      verifyRelativeURL('/develop-train/pipelines/executions/test-project-name/211');
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
