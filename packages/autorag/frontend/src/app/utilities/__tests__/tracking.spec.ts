import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  AUTORAG_EVENTS,
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
  fireAutoragVectorStoreConfigured,
  isAutoragResultsNavigationState,
  mapOptimizationMetric,
  toVectorStoreProviderType,
} from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);
const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);

describe('fireAutoragProjectDropdownOptionSelected', () => {
  it('should fire AutoRAG Project Dropdown Option Selected with the selected project', () => {
    fireAutoragProjectDropdownOptionSelected('test-namespace');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.PROJECT_DROPDOWN_OPTION_SELECTED,
      { selectedProject: 'test-namespace' },
    );
  });
});

describe('fireAutoragExperimentCreated', () => {
  it('should fire AutoRAG Experiment Created with outcome: submit and hasDescription: true', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.submit,
      hasDescription: true,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.submit,
      hasDescription: true,
      success: true,
    });
  });

  it('should fire AutoRAG Experiment Created with outcome: cancel and hasDescription: false', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.cancel,
      hasDescription: false,
      success: true,
    });
  });

  it('should pass through success: false and an allowlisted failure category when provided', () => {
    fireAutoragExperimentCreated({
      outcome: TrackingOutcome.submit,
      hasDescription: false,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
      outcome: TrackingOutcome.submit,
      hasDescription: false,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });
  });
});

describe('fireAutoragKnowledgeSourceConfigured', () => {
  it('should fire with knowledgeSourceType: s3 and outcome: submit', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 's3',
      countOfDocuments: 3,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 's3',
        countOfDocuments: 3,
        outcome: TrackingOutcome.submit,
        success: true,
      },
    );
  });

  it('should fire with outcome: cancel and success: false, since nothing was configured', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: false,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 's3',
        countOfDocuments: 0,
        outcome: TrackingOutcome.cancel,
        success: false,
      },
    );
  });

  it('should fire with knowledgeSourceType: upload, success: false and an allowlisted failure category', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 'upload',
      countOfDocuments: 0,
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 'upload',
        countOfDocuments: 0,
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
      },
    );
  });
});

describe('fireAutoragEvaluationSourceConfigured', () => {
  it('should fire with evaluationSourceType: s3 and outcome: submit', () => {
    fireAutoragEvaluationSourceConfigured({
      evaluationSourceType: 's3',
      countOfDocuments: 1,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
      {
        evaluationSourceType: 's3',
        countOfDocuments: 1,
        outcome: TrackingOutcome.submit,
        success: true,
      },
    );
  });

  it('should fire with outcome: cancel and success: false, since nothing was configured', () => {
    fireAutoragEvaluationSourceConfigured({
      evaluationSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: false,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
      {
        evaluationSourceType: 's3',
        countOfDocuments: 0,
        outcome: TrackingOutcome.cancel,
        success: false,
      },
    );
  });

  it('should fire with evaluationSourceType: upload, success: false and an allowlisted failure category', () => {
    fireAutoragEvaluationSourceConfigured({
      evaluationSourceType: 'upload',
      countOfDocuments: 0,
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
      {
        evaluationSourceType: 'upload',
        countOfDocuments: 0,
        outcome: TrackingOutcome.submit,
        success: false,
        error: AUTORAG_FAILURE_CATEGORY,
      },
    );
  });
});

describe('fireAutoragModelsSelected', () => {
  it('should fire with outcome: submit and the selected model counts', () => {
    fireAutoragModelsSelected({
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.MODELS_SELECTED, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire with outcome: cancel and zero counts when nothing is selected', () => {
    fireAutoragModelsSelected({
      countOfFoundationModels: 0,
      countOfEmbeddingModels: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.MODELS_SELECTED, {
      countOfFoundationModels: 0,
      countOfEmbeddingModels: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });
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

describe('fireAutoragVectorStoreConfigured', () => {
  it('should fire with the categorized provider type and compatible provider count', () => {
    fireAutoragVectorStoreConfigured({
      providerType: 'milvus',
      countOfCompatibleProviders: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.VECTOR_STORE_CONFIGURED, {
      providerType: 'milvus',
      countOfCompatibleProviders: 2,
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });
});

describe('mapOptimizationMetric', () => {
  it('should map all four schema values to their camelCase taxonomy', () => {
    expect(mapOptimizationMetric('overall_score')).toBe('overallScore');
    expect(mapOptimizationMetric('faithfulness')).toBe('answerFaithfulness');
    expect(mapOptimizationMetric('answer_correctness')).toBe('answerCorrectness');
    expect(mapOptimizationMetric('context_correctness')).toBe('contextCorrectness');
  });

  it('should return undefined for an unrecognized metric', () => {
    expect(mapOptimizationMetric('answer_relevance')).toBeUndefined();
    expect(mapOptimizationMetric('')).toBeUndefined();
  });
});

describe('fireAutoragRunTriggered', () => {
  it('should fire with success: true and the full derived run configuration', () => {
    fireAutoragRunTriggered({
      knowledgeSourceType: 's3',
      evaluationSourceType: 'upload',
      optimizationMetric: 'overallScore',
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

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_TRIGGERED, {
      knowledgeSourceType: 's3',
      evaluationSourceType: 'upload',
      optimizationMetric: 'overallScore',
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
  });

  it('should pass through undefined source/vector properties and an allowlisted failure category on failure', () => {
    fireAutoragRunTriggered({
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

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_TRIGGERED, {
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
    fireAutoragRunReconfigured({
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

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_RECONFIGURED, {
      knowledgeSourceType: 's3',
      evaluationSourceType: undefined,
      optimizationMetric: 'answerFaithfulness',
      vectorDatabase: 'milvus',
      countOfFoundationModels: 2,
      countOfEmbeddingModels: 1,
      changedFields: 'knowledgeSourceType,optimizationMetric',
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire an empty string for changedFields when nothing changed', () => {
    fireAutoragRunReconfigured({
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 1,
      changedFields: [],
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.RUN_RECONFIGURED,
      expect.objectContaining({ changedFields: '' }),
    );
  });

  it('should fire with success: false and the allowlisted error category on failure', () => {
    fireAutoragRunReconfigured({
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 0,
      changedFields: ['models'],
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.RUN_RECONFIGURED,
      expect.objectContaining({
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'actionFailed',
      }),
    );
  });

  it('should fire with outcome: cancel and no success field', () => {
    fireAutoragRunReconfigured({
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 0,
      changedFields: [],
      outcome: TrackingOutcome.cancel,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_RECONFIGURED, {
      countOfFoundationModels: 1,
      countOfEmbeddingModels: 0,
      changedFields: '',
      outcome: TrackingOutcome.cancel,
    });
  });
});

describe('fireAutoragRunStopped', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragRunStopped({ outcome: TrackingOutcome.submit, success: true, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_STOPPED, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragRunStopped({
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_STOPPED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });
  });

  it('should fire with outcome: cancel and no success/error', () => {
    fireAutoragRunStopped({ outcome: TrackingOutcome.cancel, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_STOPPED, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
  });
});

describe('fireAutoragRunRetried', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragRunRetried({ outcome: TrackingOutcome.submit, success: true, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_RETRIED, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragRunRetried({
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_RETRIED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'resultsPage',
    });
  });
});

describe('fireAutoragExperimentDeleted', () => {
  it('should fire with outcome: submit and success: true, given a source', () => {
    fireAutoragExperimentDeleted({
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_DELETED, {
      outcome: TrackingOutcome.submit,
      success: true,
      source: 'runsList',
    });
  });

  it('should fire with success: false and the allowlisted failure category on failure', () => {
    fireAutoragExperimentDeleted({
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'runsList',
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_DELETED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
      source: 'runsList',
    });
  });

  it('should fire with outcome: cancel when the delete confirmation modal is dismissed', () => {
    fireAutoragExperimentDeleted({ outcome: TrackingOutcome.cancel, source: 'runsList' });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_DELETED, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
  });
});

describe('fireAutoragFlowExited', () => {
  it('should fire AutoRAG Flow Exited with exitType, lastFunnelStep, and exitDestination', () => {
    fireAutoragFlowExited('navigate', 'defineDetails', 'experimentsList');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
      exitType: 'navigate',
      lastFunnelStep: 'defineDetails',
      exitDestination: 'experimentsList',
    });
  });

  it('should fire with exitType: abandon and exitDestination: none', () => {
    fireAutoragFlowExited('abandon', 'knowledge', 'none');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
      exitType: 'abandon',
      lastFunnelStep: 'knowledge',
      exitDestination: 'none',
    });
  });

  it('should fire with lastFunnelStep: run and exitDestination: otherGenAi', () => {
    fireAutoragFlowExited('navigate', 'run', 'otherGenAi');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
      exitType: 'navigate',
      lastFunnelStep: 'run',
      exitDestination: 'otherGenAi',
    });
  });
});

describe('fireAutoragS3ConnectionCreated', () => {
  it('should fire with outcome: submit and success: true', () => {
    fireAutoragS3ConnectionCreated({ outcome: TrackingOutcome.submit, success: true });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.S3_CONNECTION_CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire with outcome: submit, success: false, and the allowlisted failure category', () => {
    fireAutoragS3ConnectionCreated({
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.S3_CONNECTION_CREATED, {
      outcome: TrackingOutcome.submit,
      success: false,
      error: AUTORAG_FAILURE_CATEGORY,
    });
  });

  it('should fire with outcome: cancel and no success/error', () => {
    fireAutoragS3ConnectionCreated({ outcome: TrackingOutcome.cancel });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.S3_CONNECTION_CREATED, {
      outcome: TrackingOutcome.cancel,
    });
  });
});

describe('fireAutoragEvaluationTemplateDownloaded', () => {
  it('should fire with downloadType: evaluationTemplate', () => {
    fireAutoragEvaluationTemplateDownloaded();

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EVALUATION_TEMPLATE_DOWNLOADED,
      { downloadType: 'evaluationTemplate' },
    );
  });
});

describe('fireAutoragResultsViewed', () => {
  it('should fire AutoRAG Results Viewed with the given entrySource', () => {
    fireAutoragResultsViewed('experimentsList');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RESULTS_VIEWED, {
      entrySource: 'experimentsList',
    });
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
      fireAutoragPlaygroundOpened(source);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.PLAYGROUND_OPENED, {
        source,
      });
    },
  );
});

describe('fireAutoragNotebookDownloaded', () => {
  it.each(['indexing', 'inference', 'other'] as const)(
    'should fire AutoRAG Notebook Downloaded with notebookType: %s',
    (notebookType) => {
      fireAutoragNotebookDownloaded(notebookType);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.NOTEBOOK_DOWNLOADED, {
        notebookType,
      });
    },
  );
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
      fireAutoragResultsColumnToggled(columnName, isVisible);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.RESULTS_COLUMN_TOGGLED,
        { columnName, isVisible },
      );
    },
  );
});

describe('fireAutoragPatternDetailsViewed', () => {
  it.each(['resultsTable', 'pipelineVis', 'other'] as const)(
    'should fire AutoRAG Pattern Details Viewed with source: %s',
    (source) => {
      fireAutoragPatternDetailsViewed(source);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.PATTERN_DETAILS_VIEWED,
        { source },
      );
    },
  );
});

describe('fireAutoragPatternDetailsDownloadInitiated', () => {
  it('should fire AutoRAG Pattern Details Download Initiated with downloadType: patternDetails', () => {
    fireAutoragPatternDetailsDownloadInitiated();

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.PATTERN_DETAILS_DOWNLOAD_INITIATED,
      { downloadType: 'patternDetails' },
    );
  });
});

describe('fireAutoragCodeSnippetsExported', () => {
  it.each(['playground', 'resultsTable', 'patternDetails', 'other'] as const)(
    'should fire AutoRAG Code Snippets Exported with action: viewed and entrySource: %s',
    (entrySource) => {
      fireAutoragCodeSnippetsExported('viewed', entrySource);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.CODE_SNIPPETS_EXPORTED,
        { action: 'viewed', entrySource },
      );
    },
  );

  it('should fire AutoRAG Code Snippets Exported with action: copied and no entrySource', () => {
    fireAutoragCodeSnippetsExported('copied');

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.CODE_SNIPPETS_EXPORTED, {
      action: 'copied',
    });
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
      fireAutoragLeaderboardPresetApplied(presetType);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.LEADERBOARD_PRESET_APPLIED,
        { presetType },
      );
    },
  );
});

describe('fireAutoragPatternsCompared', () => {
  it('should fire AutoRAG Patterns Compared with the given interactionType, rankDifference, and scoreDifference', () => {
    fireAutoragPatternsCompared('initial', 1, 0.4);

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.PATTERNS_COMPARED, {
      interactionType: 'initial',
      rankDifference: 1,
      scoreDifference: 0.4,
    });
  });

  it('should fire with interactionType: changed and negative rankDifference/scoreDifference', () => {
    fireAutoragPatternsCompared('changed', -5, -0.15);

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.PATTERNS_COMPARED, {
      interactionType: 'changed',
      rankDifference: -5,
      scoreDifference: -0.15,
    });
  });

  it('should round scoreDifference to 4 decimal places to avoid floating-point noise', () => {
    fireAutoragPatternsCompared('initial', 1, 0.45 - 0.66);

    expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.PATTERNS_COMPARED, {
      interactionType: 'initial',
      rankDifference: 1,
      scoreDifference: -0.21,
    });
  });
});
