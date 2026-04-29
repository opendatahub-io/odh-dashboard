/* eslint-disable camelcase -- BFF API uses snake_case field names */
import { mockModArchResponse } from 'mod-arch-core';
import { mockAutoragPatterns } from '~/app/mocks/mockAutoRAGPatterns';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { autoragResultsPage } from '~/__tests__/cypress/cypress/pages/autoragResults';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';

const RUN_ID = 'test-run-001';
const NAMESPACE = 'kubeflow';
const UUID = 'abc12345-6789-def0-1234-567890abcdef';

const PATTERN_NAMES = mockAutoragPatterns.map((p) => p.name);

// Sort patterns by final_score descending (matches leaderboard ranking)
const sortedPatterns = mockAutoragPatterns.toSorted((a, b) => b.final_score - a.final_score);

const mockPipelineRun = {
  run_id: RUN_ID,
  display_name: 'autorag-test-run',
  created_at: '2025-01-01T00:00:00Z',
  state: 'SUCCEEDED',
  finished_at: '2025-01-01T01:00:00Z',
  pipeline_spec: {
    root: {
      dag: {
        tasks: {
          'rag-data-loader': {
            taskInfo: { name: 'rag-data-loader' },
            componentRef: { name: 'comp-rag-data-loader' },
          },
          'rag-templates-optimization': {
            taskInfo: { name: 'rag-templates-optimization' },
            componentRef: { name: 'comp-rag-templates-optimization' },
            dependentTasks: ['rag-data-loader'],
          },
        },
      },
    },
  },
  runtime_config: {
    parameters: {
      optimization_metric: 'faithfulness',
      optimization_max_rag_patterns: 5,
    },
  },
};

const mockEvaluationResults: AutoRAGEvaluationResult[] = [
  {
    question: 'What is RAG?',
    correct_answers: ['RAG stands for Retrieval-Augmented Generation'],
    question_id: 'q1',
    answer:
      'RAG is a technique that combines retrieval with generation to produce more accurate responses.',
    answer_contexts: [{ text: 'RAG combines retrieval and generation...', document_id: 'doc1' }],
    scores: { answer_correctness: 0.85, faithfulness: 0.92, context_correctness: 1.0 },
  },
  {
    question: 'What are RAG evaluation metrics?',
    correct_answers: ['Faithfulness, answer correctness, and context correctness'],
    question_id: 'q2',
    answer: 'The key metrics include faithfulness and answer correctness.',
    answer_contexts: [
      {
        text: 'Common evaluation metrics for RAG systems...',
        document_id: 'doc2',
      },
    ],
    scores: { answer_correctness: 0.78, faithfulness: 0.88, context_correctness: 0.9 },
  },
];

const ROOT_DIR = 'documents-rag-optimization-pipeline';
const PATTERN_GEN_DIR = 'rag-templates-optimization';

const initResultsIntercepts = () => {
  // App shell endpoints required when running via packages/cypress project context (CI).
  // The autorag support file's beforeEach provides these locally, but CI uses
  // --project ../packages/cypress which loads a different support file.
  cy.intercept(
    { method: 'GET', pathname: '/api/v1/user' },
    mockModArchResponse(mockUserSettings({})),
  );
  cy.intercept(
    { method: 'GET', pathname: '/api/v1/namespaces' },
    mockModArchResponse([mockNamespace({})]),
  );

  // Pipeline run endpoint — returns a SUCCEEDED run
  cy.intercept(
    { method: 'GET', pathname: `/autorag/api/v1/pipeline-runs/${RUN_ID}` },
    mockModArchResponse(mockPipelineRun),
  );

  // S3 files listing — Stage 1: UUID directory discovery
  cy.intercept(
    {
      method: 'GET',
      pathname: '/autorag/api/v1/s3/files',
      query: { path: `${ROOT_DIR}/${RUN_ID}/${PATTERN_GEN_DIR}` },
    },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: [{ prefix: `${ROOT_DIR}/${RUN_ID}/${PATTERN_GEN_DIR}/${UUID}/` }],
        contents: [],
        key_count: 1,
      }),
    ),
  );

  // S3 files listing — Stage 2: pattern directory listing
  cy.intercept(
    {
      method: 'GET',
      pathname: '/autorag/api/v1/s3/files',
      query: {
        path: `${ROOT_DIR}/${RUN_ID}/${PATTERN_GEN_DIR}/${UUID}/rag_patterns`,
      },
    },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: PATTERN_NAMES.map((name) => ({
          prefix: `${ROOT_DIR}/${RUN_ID}/${PATTERN_GEN_DIR}/${UUID}/rag_patterns/${name}/`,
        })),
        contents: [],
        key_count: PATTERN_NAMES.length,
      }),
    ),
  );

  // S3 file download — Stage 3: pattern.json for each pattern
  mockAutoragPatterns.forEach((pattern) => {
    const baseDir = `${ROOT_DIR}/${RUN_ID}/${PATTERN_GEN_DIR}/${UUID}/rag_patterns/${pattern.name}`;

    cy.intercept(
      {
        method: 'GET',
        pathname: '/autorag/api/v1/s3/file',
        query: { key: `${baseDir}/pattern.json` },
      },
      { body: pattern, headers: { 'content-type': 'application/json' } },
    );

    // Evaluation results for each pattern (for Sample Q&A tab)
    cy.intercept(
      {
        method: 'GET',
        pathname: '/autorag/api/v1/s3/file',
        query: { key: `${baseDir}/evaluation_results.json` },
      },
      { body: mockEvaluationResults, headers: { 'content-type': 'application/json' } },
    );
  });

  // Pipeline runs list (for experiments page)
  cy.intercept(
    { method: 'GET', pathname: '/autorag/api/v1/pipeline-runs' },
    mockModArchResponse({
      runs: [mockPipelineRun],
      total_size: 1,
      next_page_token: '',
    }),
  );
};

describe('AutoRAG Results Page', () => {
  beforeEach(() => {
    initResultsIntercepts();
  });

  describe('Leaderboard', () => {
    it('should display leaderboard with pattern rows', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findLeaderboardRow(1).should('exist');
      autoragResultsPage.findLeaderboardRow(2).should('exist');
      autoragResultsPage.findLeaderboardRow(3).should('exist');
    });

    it('should show top rank label on first pattern', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findTopRankLabel().should('exist');
    });

    it('should open manage columns modal and hide a column', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findMetricHeader('answer_correctness').should('exist');

      autoragResultsPage.findManageColumnsButton().click();
      autoragResultsPage.findManageColumnsDescription().should('be.visible');

      autoragResultsPage.findColumnCheck('metric:answer_correctness').click();
      autoragResultsPage.findManageColumnsSaveButton().click();

      autoragResultsPage.findMetricHeader('answer_correctness').should('not.exist');
    });
  });

  describe('Pattern Details Modal — Tabs', () => {
    it('should open modal with Pattern information tab, score types, and progress bars', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findPatternLink(1).click();
      autoragResultsPage.findPatternDetailsModal().should('be.visible');

      autoragResultsPage.findTab('pattern_information').should('exist');

      // Score type radio buttons
      autoragResultsPage.findScoreTypeRadio('mean').should('exist');
      autoragResultsPage.findScoreTypeRadio('ci_high').should('exist');
      autoragResultsPage.findScoreTypeRadio('ci_low').should('exist');

      autoragResultsPage.findScoreTypeRadio('ci_high').click();
      autoragResultsPage.findScoreTypeRadio('ci_low').click();
      autoragResultsPage.findScoreTypeRadio('mean').click();

      // Score progress bars
      autoragResultsPage.findScoreProgress('answer_correctness').should('exist');
      autoragResultsPage.findScoreProgress('faithfulness').should('exist');
      autoragResultsPage.findScoreProgress('context_correctness').should('exist');
    });

    it('should navigate through all settings tabs', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);
      autoragResultsPage.findPatternLink(1).click();
      autoragResultsPage.findPatternDetailsModal().should('be.visible');

      autoragResultsPage.findTab('vector_store').should('exist').click();
      autoragResultsPage.findPatternDetailsModal().should('contain.text', 'milvus');

      autoragResultsPage.findTab('chunking').should('exist').click();
      autoragResultsPage.findPatternDetailsModal().should('contain.text', 'recursive');

      autoragResultsPage.findTab('embedding').should('exist').click();
      autoragResultsPage.findPatternDetailsModal().should('contain.text', 'cosine');

      autoragResultsPage.findTab('retrieval').should('exist').click();
      autoragResultsPage.findPatternDetailsModal().should('contain.text', 'window');

      autoragResultsPage.findTab('generation').should('exist').click();
      autoragResultsPage.findPatternDetailsModal().should('contain.text', '{document}');

      autoragResultsPage.findTab('sample_qa').should('exist').click();
      autoragResultsPage.findQAEntry('q1').should('exist');
      autoragResultsPage.findQAEntry('q2').should('exist');
    });

    it('should close modal', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findPatternLink(1).click();
      autoragResultsPage.findPatternDetailsModal().should('be.visible');

      autoragResultsPage.findPatternDetailsModalCloseButton().click();
      autoragResultsPage.findPatternDetailsModal().should('not.exist');
    });
  });

  describe('Pattern Details Modal — Pattern Selector', () => {
    it('should switch between patterns using the pattern selector dropdown', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findPatternLink(1).click();
      autoragResultsPage.findPatternDetailsModal().should('be.visible');

      // Open selector and switch to a different pattern
      autoragResultsPage.findPatternSelectorDropdown().click();
      autoragResultsPage.findPatternSelectorOption(sortedPatterns[1].name).click();

      autoragResultsPage.findPatternDetailsModal().should('be.visible');
      autoragResultsPage
        .findPatternSelectorDropdown()
        .invoke('text')
        .should('match', new RegExp(sortedPatterns[1].name.replace(/(\D)(\d)/, '$1.?$2')));
    });
  });

  describe('Pattern Details Modal — Download', () => {
    it('should download notebook via print', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findPatternLink(1).click();
      autoragResultsPage.findPatternDetailsModal().should('be.visible');

      cy.window().then((win) => cy.stub(win, 'print'));
      autoragResultsPage.findPatternDetailsDownload().click();
      cy.window().its('print').should('have.been.calledOnce');
    });
  });

  describe('Run Details Drawer', () => {
    it('should open and close run details drawer', () => {
      autoragResultsPage.visit(NAMESPACE, RUN_ID);

      autoragResultsPage.findRunDetailsButton().click();
      autoragResultsPage.findRunDetailsDrawerPanel().should('be.visible');

      autoragResultsPage.findRunDetailsDrawerCloseButton().click();
      autoragResultsPage.findRunDetailsDrawerPanel().should('not.be.visible');
    });
  });
});
