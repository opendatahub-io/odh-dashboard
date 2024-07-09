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
import { configIntercept, dspaIntercepts, projectsIntercept } from './intercepts';

const projectName = 'test-project-name';

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
        artifactsTable.findRows().should('have.length', 4);
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
        artifactsTable.findRows().should('have.length', 2);
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
});

export const initIntercepts = (): void => {
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);
};
