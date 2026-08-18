import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  AUTORAG_EVENTS,
  AUTORAG_FAILURE_CATEGORY,
  fireAutoragEvaluationSourceConfigured,
  fireAutoragExperimentCreated,
  fireAutoragFlowExited,
  fireAutoragKnowledgeSourceConfigured,
  fireAutoragModelsSelected,
  fireAutoragProjectDropdownOptionSelected,
  fireAutoragRunTriggered,
  fireAutoragVectorStoreConfigured,
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

  it('should fire with outcome: cancel', () => {
    fireAutoragKnowledgeSourceConfigured({
      knowledgeSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      {
        knowledgeSourceType: 's3',
        countOfDocuments: 0,
        outcome: TrackingOutcome.cancel,
        success: true,
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

  it('should fire with outcome: cancel', () => {
    fireAutoragEvaluationSourceConfigured({
      evaluationSourceType: 's3',
      countOfDocuments: 0,
      outcome: TrackingOutcome.cancel,
      success: true,
    });

    expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
      {
        evaluationSourceType: 's3',
        countOfDocuments: 0,
        outcome: TrackingOutcome.cancel,
        success: true,
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
