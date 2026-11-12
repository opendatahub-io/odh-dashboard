import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  AUTORAG_FAILURE_CATEGORY,
  buildRunReconfiguredChangedFields,
  fireAutoragEvaluationSourceConfigured,
  fireAutoragExperimentCreated,
  fireAutoragFlowExited,
  fireAutoragKnowledgeSourceConfigured,
  fireAutoragLeaderboardPresetApplied,
  fireAutoragModelsSelected,
  fireAutoragPatternsCompared,
  fireAutoragEvaluationTemplateDownloaded,
  fireAutoragProjectDropdownOptionSelected,
  fireAutoragCodeSnippetsExported,
  fireAutoragExperimentDeleted,
  fireAutoragNotebookDownloaded,
  fireAutoragPatternDetailsDownloadInitiated,
  fireAutoragPatternDetailsViewed,
  fireAutoragPlaygroundOpened,
  fireAutoragResultsColumnToggled,
  fireAutoragResultsViewed,
  fireAutoragRunReconfigured,
  fireAutoragRunRetried,
  fireAutoragRunStopped,
  fireAutoragRunTriggered,
  fireAutoragS3ConnectionCreated,
  fireAutoragStarterKitDownloaded,
  fireAutoragVectorStoreConfigured,
  getVectorStoreProviderTypeFromDatabaseProviders,
  isAutoragResultsNavigationState,
  mapOptimizationMetric,
  mapOptimizationMetricEvaluator,
  toVectorStoreProviderType,
} from '~/app/utilities/tracking';

const trackEventMock = jest.fn();

describe('fireAutoragProjectDropdownOptionSelected', () => {
  it('should fire AutoRAG Project Dropdown Option Selected with the selected project', () => {
    fireAutoragProjectDropdownOptionSelected(trackEventMock, 'test-namespace');

    expect(trackEventMock.mock.calls).toEqual([
      ['AutoRAG Project Dropdown Option Selected', { selectedProject: 'test-namespace' }],
    ]);
  });
});

describe('fireAutoragExperimentCreated', () => {
  it('should fire AutoRAG Experiment Created with outcome: submit and hasDescription: true', () => {
    fireAutoragExperimentCreated(trackEventMock, {
      outcome: TrackingOutcome.submit,
      hasDescription: true,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Created',
        {
          outcome: TrackingOutcome.submit,
          hasDescription: true,
          success: true,
        },
      ],
    ]);
  });

  it('should fire AutoRAG Experiment Created with outcome: cancel and hasDescription: false', () => {
    fireAutoragExperimentCreated(trackEventMock, {
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Created',
        {
          outcome: TrackingOutcome.cancel,
          hasDescription: false,
          success: true,
        },
      ],
    ]);
  });

  it('should pass through success: false and an allowlisted failure category when provided', () => {
    fireAutoragExperimentCreated(trackEventMock, {
      outcome: TrackingOutcome.submit,
      hasDescription: false,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Created',
        {
          outcome: TrackingOutcome.submit,
          hasDescription: false,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
        },
      ],
    ]);
  });
});

describe('fireAutoragKnowledgeSourceConfigured', () => {
  it('should fire with knowledgeSourceType: s3 and outcome: submit', () => {
    fireAutoragKnowledgeSourceConfigured(trackEventMock, {
      knowledgeSourceType: 's3',
      countOfDocuments: 3,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Knowledge Source Configured',
        {
          knowledgeSourceType: 's3',
          countOfDocuments: 3,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel and success: false, since nothing was configured', () => {
    fireAutoragKnowledgeSourceConfigured(trackEventMock, {
      knowledgeSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: false,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Knowledge Source Configured',
        {
          knowledgeSourceType: 's3',
          countOfDocuments: 0,
          outcome: TrackingOutcome.cancel,
          success: false,
        },
      ],
    ]);
  });

  it('should fire with knowledgeSourceType: upload, success: false and an allowlisted failure category', () => {
    fireAutoragKnowledgeSourceConfigured(trackEventMock, {
      knowledgeSourceType: 'upload',
      countOfDocuments: 0,
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Knowledge Source Configured',
        {
          knowledgeSourceType: 'upload',
          countOfDocuments: 0,
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
        },
      ],
    ]);
  });
});

describe('fireAutoragEvaluationSourceConfigured', () => {
  it('should fire with evaluationSourceType: s3 and outcome: submit', () => {
    fireAutoragEvaluationSourceConfigured(trackEventMock, {
      evaluationSourceType: 's3',
      countOfDocuments: 1,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Evaluation Source Configured',
        {
          evaluationSourceType: 's3',
          countOfDocuments: 1,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel and success: false, since nothing was configured', () => {
    fireAutoragEvaluationSourceConfigured(trackEventMock, {
      evaluationSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: false,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Evaluation Source Configured',
        {
          evaluationSourceType: 's3',
          countOfDocuments: 0,
          outcome: TrackingOutcome.cancel,
          success: false,
        },
      ],
    ]);
  });

  it('should fire with evaluationSourceType: upload, success: false and an allowlisted failure category', () => {
    fireAutoragEvaluationSourceConfigured(trackEventMock, {
      evaluationSourceType: 'upload',
      countOfDocuments: 0,
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Evaluation Source Configured',
        {
          evaluationSourceType: 'upload',
          countOfDocuments: 0,
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
        },
      ],
    ]);
  });
});

describe('fireAutoragModelsSelected', () => {
  it('should fire with outcome: submit and the selected model counts', () => {
    fireAutoragModelsSelected(trackEventMock, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Models Selected',
        {
          countOfFoundationModels: 1,
          countOfEmbeddingModels: 2,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel and zero counts when nothing is selected', () => {
    fireAutoragModelsSelected(trackEventMock, {
      countOfFoundationModels: 0,
      countOfEmbeddingModels: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Models Selected',
        {
          countOfFoundationModels: 0,
          countOfEmbeddingModels: 0,
          outcome: TrackingOutcome.cancel,
          success: true,
        },
      ],
    ]);
  });
});

describe('toVectorStoreProviderType', () => {
  it('should map remote::milvus to milvus', () => {
    expect(toVectorStoreProviderType('remote::milvus')).toBe('milvus');
  });

  it('should map remote::pgvector to pgvector', () => {
    expect(toVectorStoreProviderType('remote::pgvector')).toBe('pgvector');
  });

  it('should return undefined for an unrecognized provider type', () => {
    expect(toVectorStoreProviderType('inline::faiss')).toBeUndefined();
    expect(toVectorStoreProviderType('')).toBeUndefined();
  });
});

describe('getVectorStoreProviderTypeFromDatabaseProviders', () => {
  it('should map authoritative Milvus metadata', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['milvus'])).toBe('milvus');
  });

  it('should infer PGVector from its complete redacted key metadata', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['pgvector'])).toBe('pgvector');
  });

  it('should omit provider type for ambiguous or incomplete metadata', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['milvus', 'pgvector'])).toBeUndefined();
    expect(getVectorStoreProviderTypeFromDatabaseProviders([])).toBeUndefined();
  });

  it('should omit provider type when Neo4j credentials are mixed with vector credentials', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['milvus', 'neo4j'])).toBeUndefined();
  });

  it('should reject Neo4j URI-only and legacy Milvus metadata', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders([])).toBeUndefined();
    expect(getVectorStoreProviderTypeFromDatabaseProviders(undefined)).toBeUndefined();
  });

  it('should infer Neo4j from complete metadata mixed with the legacy Milvus key', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['neo4j'])).toBe('neo4j');
  });

  it('should infer PGVector from complete metadata mixed with the legacy Milvus key', () => {
    expect(getVectorStoreProviderTypeFromDatabaseProviders(['pgvector'])).toBe('pgvector');
  });
});

describe('fireAutoragVectorStoreConfigured', () => {
  it('should fire with the categorized provider type and compatible provider count', () => {
    fireAutoragVectorStoreConfigured(trackEventMock, {
      providerType: 'milvus',
      countOfCompatibleProviders: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Vector Store Configured',
        {
          providerType: 'milvus',
          countOfCompatibleProviders: 2,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
    const payload = trackEventMock.mock.calls[trackEventMock.mock.calls.length - 1][1];
    expect(payload).not.toHaveProperty('secretName');
    expect(payload).not.toHaveProperty('MILVUS_URI');
  });
});

describe('mapOptimizationMetric', () => {
  it('should map qualified schema values to their camelCase taxonomy', () => {
    expect(mapOptimizationMetric('custom:overall_score')).toBe('overallScore');
    expect(mapOptimizationMetric('unitxt:faithfulness')).toBe('answerFaithfulness');
    expect(mapOptimizationMetric('unitxt:answer_correctness')).toBe('answerCorrectness');
    expect(mapOptimizationMetric('ragas:context_precision')).toBe('contextPrecision');
  });

  it('should return undefined for an unrecognized metric', () => {
    expect(mapOptimizationMetric('answer_relevance')).toBeUndefined();
    expect(mapOptimizationMetric('')).toBeUndefined();
  });
});

describe('mapOptimizationMetricEvaluator', () => {
  it('should distinguish Unitxt and RAGAS faithfulness evaluators', () => {
    expect(mapOptimizationMetricEvaluator('unitxt:faithfulness')).toBe('unitxt');
    expect(mapOptimizationMetricEvaluator('ragas:faithfulness')).toBe('ragas');
  });

  it('should map custom overall score and reject unqualified metrics', () => {
    expect(mapOptimizationMetricEvaluator('custom:overall_score')).toBe('custom');
    expect(mapOptimizationMetricEvaluator('faithfulness')).toBeUndefined();
    expect(mapOptimizationMetricEvaluator('custom:unsupported')).toBeUndefined();
    expect(mapOptimizationMetricEvaluator('')).toBeUndefined();
  });
});

describe('fireAutoragRunTriggered', () => {
  it('should fire with success: true and the full derived run configuration', () => {
    fireAutoragRunTriggered(trackEventMock, {
      knowledgeSourceType: 's3',
      evaluationSourceType: 'upload',
      optimizationMetric: 'overallScore',
      optimizationMetricEvaluator: 'custom',
      vectorDatabase: 'milvus',
      countOfModels: 3,
      countOfKnowledgeDocuments: 1,
      countOfEvaluationDocuments: 1,
      countOfFoundationModels: 2,
      countOfEmbeddingModels: 1,
      hasS3Connection: true,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Triggered',
        {
          knowledgeSourceType: 's3',
          evaluationSourceType: 'upload',
          optimizationMetric: 'overallScore',
          optimizationMetricEvaluator: 'custom',
          vectorDatabase: 'milvus',
          countOfModels: 3,
          countOfKnowledgeDocuments: 1,
          countOfEvaluationDocuments: 1,
          countOfFoundationModels: 2,
          countOfEmbeddingModels: 1,
          hasS3Connection: true,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should pass through undefined source/vector properties and an allowlisted failure category on failure', () => {
    fireAutoragRunTriggered(trackEventMock, {
      knowledgeSourceType: undefined,
      evaluationSourceType: undefined,
      optimizationMetric: undefined,
      vectorDatabase: undefined,
      countOfModels: 0,
      countOfKnowledgeDocuments: 0,
      countOfEvaluationDocuments: 0,
      countOfFoundationModels: 0,
      countOfEmbeddingModels: 0,
      hasS3Connection: false,
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Triggered',
        {
          knowledgeSourceType: undefined,
          evaluationSourceType: undefined,
          optimizationMetric: undefined,
          vectorDatabase: undefined,
          countOfModels: 0,
          countOfKnowledgeDocuments: 0,
          countOfEvaluationDocuments: 0,
          countOfFoundationModels: 0,
          countOfEmbeddingModels: 0,
          hasS3Connection: false,
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
        },
      ],
    ]);
  });
});

describe('buildRunReconfiguredChangedFields', () => {
  it('should return an empty array when nothing changed', () => {
    expect(
      buildRunReconfiguredChangedFields({
        knowledgeSourceTypeChanged: false,
        evaluationSourceTypeChanged: false,
        optimizationMetricChanged: false,
        vectorDatabaseChanged: false,
        modelsChanged: false,
      }),
    ).toEqual([]);
  });

  it('should list every field that changed, in a fixed order', () => {
    expect(
      buildRunReconfiguredChangedFields({
        knowledgeSourceTypeChanged: true,
        evaluationSourceTypeChanged: true,
        optimizationMetricChanged: true,
        vectorDatabaseChanged: true,
        modelsChanged: true,
      }),
    ).toEqual([
      'knowledgeSourceType',
      'evaluationSourceType',
      'optimizationMetric',
      'vectorDatabase',
      'models',
    ]);
  });

  it('should list only the fields that changed', () => {
    expect(
      buildRunReconfiguredChangedFields({
        knowledgeSourceTypeChanged: false,
        evaluationSourceTypeChanged: true,
        optimizationMetricChanged: false,
        vectorDatabaseChanged: false,
        modelsChanged: true,
      }),
    ).toEqual(['evaluationSourceType', 'models']);
  });
});

describe('fireAutoragRunReconfigured', () => {
  it('should join changedFields with a comma and fire with success: true on submit', () => {
    fireAutoragRunReconfigured(trackEventMock, {
      knowledgeSourceType: 's3',
      evaluationSourceType: undefined,
      optimizationMetric: 'answerFaithfulness',
      vectorDatabase: 'milvus',
      countOfFoundationModels: 2,
      countOfEmbeddingModels: 1,
      changedFields: ['knowledgeSourceType', 'optimizationMetric'],
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Reconfigured',
        {
          knowledgeSourceType: 's3',
          evaluationSourceType: undefined,
          optimizationMetric: 'answerFaithfulness',
          vectorDatabase: 'milvus',
          countOfFoundationModels: 2,
          countOfEmbeddingModels: 1,
          changedFields: 'knowledgeSourceType,optimizationMetric',
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should fire an empty string for changedFields when nothing changed', () => {
    fireAutoragRunReconfigured(trackEventMock, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 1,
      changedFields: [],
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      ['AutoRAG Run Reconfigured', expect.objectContaining({ changedFields: '' })],
    ]);
  });

  it('should fire with success: false and the allowlisted error category on failure', () => {
    fireAutoragRunReconfigured(trackEventMock, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 0,
      changedFields: ['models'],
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Reconfigured',
        expect.objectContaining({
          outcome: TrackingOutcome.submit,
          success: false,
          error: 'actionFailed',
        }),
      ],
    ]);
  });

  it('should fire with outcome: cancel and no success field', () => {
    fireAutoragRunReconfigured(trackEventMock, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 0,
      changedFields: [],
      outcome: TrackingOutcome.cancel,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Reconfigured',
        {
          countOfFoundationModels: 1,
          countOfEmbeddingModels: 0,
          changedFields: '',
          outcome: TrackingOutcome.cancel,
        },
      ],
    ]);
  });
});

describe('fireAutoragRunStopped', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragRunStopped(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Stopped',
        {
          outcome: TrackingOutcome.submit,
          success: true,
          source: 'runsList',
        },
      ],
    ]);
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragRunStopped(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Stopped',
        {
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
          source: 'resultsPage',
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel and no success/error', () => {
    fireAutoragRunStopped(trackEventMock, { outcome: TrackingOutcome.cancel, source: 'runsList' });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Stopped',
        {
          outcome: TrackingOutcome.cancel,
          source: 'runsList',
        },
      ],
    ]);
  });
});

describe('fireAutoragRunRetried', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragRunRetried(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Retried',
        {
          outcome: TrackingOutcome.submit,
          success: true,
          source: 'runsList',
        },
      ],
    ]);
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragRunRetried(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Run Retried',
        {
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
          source: 'resultsPage',
        },
      ],
    ]);
  });
});

describe('fireAutoragExperimentDeleted', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragExperimentDeleted(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Deleted',
        {
          outcome: TrackingOutcome.submit,
          success: true,
          source: 'runsList',
        },
      ],
    ]);
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragExperimentDeleted(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'runsList',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Deleted',
        {
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
          source: 'runsList',
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel when the delete confirmation modal is dismissed', () => {
    fireAutoragExperimentDeleted(trackEventMock, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Experiment Deleted',
        {
          outcome: TrackingOutcome.cancel,
          source: 'runsList',
        },
      ],
    ]);
  });
});

describe('fireAutoragFlowExited', () => {
  it('should fire AutoRAG Flow Exited with exitType, lastFunnelStep, and exitDestination', () => {
    fireAutoragFlowExited(trackEventMock, 'navigate', 'defineDetails', 'experimentsList');

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Flow Exited',
        {
          exitType: 'navigate',
          lastFunnelStep: 'defineDetails',
          exitDestination: 'experimentsList',
        },
      ],
    ]);
  });

  it('should fire with exitType: abandon and exitDestination: none', () => {
    fireAutoragFlowExited(trackEventMock, 'abandon', 'knowledge', 'none');

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Flow Exited',
        {
          exitType: 'abandon',
          lastFunnelStep: 'knowledge',
          exitDestination: 'none',
        },
      ],
    ]);
  });

  it('should fire with lastFunnelStep: run and exitDestination: otherGenAi', () => {
    fireAutoragFlowExited(trackEventMock, 'navigate', 'run', 'otherGenAi');

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Flow Exited',
        {
          exitType: 'navigate',
          lastFunnelStep: 'run',
          exitDestination: 'otherGenAi',
        },
      ],
    ]);
  });
});

describe('fireAutoragS3ConnectionCreated', () => {
  it('should fire with outcome: submit and success: true', () => {
    fireAutoragS3ConnectionCreated(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG S3 Connection Created',
        {
          outcome: TrackingOutcome.submit,
          success: true,
        },
      ],
    ]);
  });

  it('should fire with outcome: submit, success: false, and the allowlisted failure category', () => {
    fireAutoragS3ConnectionCreated(trackEventMock, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG S3 Connection Created',
        {
          outcome: TrackingOutcome.submit,
          success: false,
          error: AUTORAG_FAILURE_CATEGORY,
        },
      ],
    ]);
  });

  it('should fire with outcome: cancel and no success/error', () => {
    fireAutoragS3ConnectionCreated(trackEventMock, { outcome: TrackingOutcome.cancel });

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG S3 Connection Created',
        {
          outcome: TrackingOutcome.cancel,
        },
      ],
    ]);
  });
});

describe('fireAutoragEvaluationTemplateDownloaded', () => {
  it('should fire with downloadType: evaluationTemplate', () => {
    fireAutoragEvaluationTemplateDownloaded(trackEventMock);

    expect(trackEventMock.mock.calls).toEqual([
      ['AutoRAG Evaluation Template Downloaded', { downloadType: 'evaluationTemplate' }],
    ]);
  });
});

describe('fireAutoragResultsViewed', () => {
  it('should fire AutoRAG Results Viewed with the given entrySource', () => {
    fireAutoragResultsViewed(trackEventMock, 'experimentsList');

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Results Viewed',
        {
          entrySource: 'experimentsList',
        },
      ],
    ]);
  });
});

describe('isAutoragResultsNavigationState', () => {
  it.each(['experimentsList', 'notification', 'direct', 'other'] as const)(
    'should accept entrySource: %s',
    (entrySource) => {
      expect(isAutoragResultsNavigationState({ entrySource })).toBe(true);
    },
  );

  it('should reject an unknown entrySource', () => {
    expect(isAutoragResultsNavigationState({ entrySource: 'somethingElse' })).toBe(false);
  });

  it('should reject state missing entrySource', () => {
    expect(isAutoragResultsNavigationState({})).toBe(false);
  });

  it('should reject null/undefined/non-object state', () => {
    expect(isAutoragResultsNavigationState(null)).toBe(false);
    expect(isAutoragResultsNavigationState(undefined)).toBe(false);
    expect(isAutoragResultsNavigationState('experimentsList')).toBe(false);
  });
});

describe('fireAutoragPlaygroundOpened', () => {
  it.each(['resultsTable', 'patternDetails', 'other'] as const)(
    'should fire AutoRAG Playground Opened with source: %s',
    (source) => {
      fireAutoragPlaygroundOpened(trackEventMock, source);

      expect(trackEventMock.mock.calls).toEqual([
        [
          'AutoRAG Playground Opened',
          {
            source,
          },
        ],
      ]);
    },
  );
});

describe('fireAutoragNotebookDownloaded', () => {
  it.each(['indexing', 'inference', 'other'] as const)(
    'should fire AutoRAG Notebook Downloaded with notebookType: %s',
    (notebookType) => {
      fireAutoragNotebookDownloaded(trackEventMock, notebookType);

      expect(trackEventMock.mock.calls).toEqual([
        [
          'AutoRAG Notebook Downloaded',
          {
            notebookType,
          },
        ],
      ]);
    },
  );
});

describe('fireAutoragStarterKitDownloaded', () => {
  it('should fire AutoRAG Starter Kit Downloaded with the starter kit type', () => {
    fireAutoragStarterKitDownloaded(trackEventMock);

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Starter Kit Downloaded',
        {
          downloadType: 'starterKit',
        },
      ],
    ]);
  });
});

describe('fireAutoragResultsColumnToggled', () => {
  it.each([
    ['rank', true],
    ['patternName', false],
    ['modelNames', true],
    ['answerFaithfulness', false],
    ['otherMetric', true],
    ['chunkingMethod', false],
    ['other', true],
  ] as const)(
    'should fire AutoRAG Results Column Toggled with columnName: %s, isVisible: %s',
    (columnName, isVisible) => {
      fireAutoragResultsColumnToggled(trackEventMock, columnName, isVisible);

      expect(trackEventMock.mock.calls).toEqual([
        ['AutoRAG Results Column Toggled', { columnName, isVisible }],
      ]);
    },
  );
});

describe('fireAutoragPatternDetailsViewed', () => {
  it.each(['resultsTable', 'pipelineVis', 'other'] as const)(
    'should fire AutoRAG Pattern Details Viewed with source: %s',
    (source) => {
      fireAutoragPatternDetailsViewed(trackEventMock, source);

      expect(trackEventMock.mock.calls).toEqual([['AutoRAG Pattern Details Viewed', { source }]]);
    },
  );
});

describe('fireAutoragPatternDetailsDownloadInitiated', () => {
  it('should fire AutoRAG Pattern Details Download Initiated with downloadType: patternDetails', () => {
    fireAutoragPatternDetailsDownloadInitiated(trackEventMock);

    expect(trackEventMock.mock.calls).toEqual([
      ['AutoRAG Pattern Details Download Initiated', { downloadType: 'patternDetails' }],
    ]);
  });
});

describe('fireAutoragCodeSnippetsExported', () => {
  it.each(['resultsTable', 'patternDetails', 'other'] as const)(
    'should fire AutoRAG Code Snippets Exported with action: viewed and entrySource: %s',
    (entrySource) => {
      fireAutoragCodeSnippetsExported(trackEventMock, 'viewed', entrySource);

      expect(trackEventMock.mock.calls).toEqual([
        ['AutoRAG Code Snippets Exported', { action: 'viewed', entrySource }],
      ]);
    },
  );

  it('should fire AutoRAG Code Snippets Exported with action: copied and no entrySource', () => {
    fireAutoragCodeSnippetsExported(trackEventMock, 'copied');

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Code Snippets Exported',
        {
          action: 'copied',
        },
      ],
    ]);
  });
});

describe('fireAutoragLeaderboardPresetApplied', () => {
  it.each([
    'optimizationMetrics',
    'optimizationMetricsAndChunking',
    'fullConfiguration',
    'other',
  ] as const)(
    'should fire AutoRAG Leaderboard Preset Applied with presetType: %s',
    (presetType) => {
      fireAutoragLeaderboardPresetApplied(trackEventMock, presetType);

      expect(trackEventMock.mock.calls).toEqual([
        ['AutoRAG Leaderboard Preset Applied', { presetType }],
      ]);
    },
  );
});

describe('fireAutoragPatternsCompared', () => {
  it('should fire AutoRAG Patterns Compared with the given interactionType, rankDifference, and scoreDifference', () => {
    fireAutoragPatternsCompared(trackEventMock, 'initial', 1, 0.4);

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Patterns Compared',
        {
          interactionType: 'initial',
          rankDifference: 1,
          scoreDifference: 0.4,
        },
      ],
    ]);
  });

  it('should fire with interactionType: changed and negative rankDifference/scoreDifference', () => {
    fireAutoragPatternsCompared(trackEventMock, 'changed', -5, -0.15);

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Patterns Compared',
        {
          interactionType: 'changed',
          rankDifference: -5,
          scoreDifference: -0.15,
        },
      ],
    ]);
  });

  it('should round scoreDifference to 4 decimal places to avoid floating-point noise', () => {
    fireAutoragPatternsCompared(trackEventMock, 'initial', 1, 0.45 - 0.66);

    expect(trackEventMock.mock.calls).toEqual([
      [
        'AutoRAG Patterns Compared',
        {
          interactionType: 'initial',
          rankDifference: 1,
          scoreDifference: -0.21,
        },
      ],
    ]);
  });
});
