import { LMEvaluationKind } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';

type MockLMEvaluationConfigType = {
  name?: string;
  namespace?: string;
  modelName?: string;
  evalDataset?: string;
  evalMetrics?: string[];
  batchSize?: number;
  timeout?: number;
  phase?: 'Pending' | 'Running' | 'Succeeded' | 'Failed';
  completionTime?: string;
  startTime?: string;
  results?: Array<{
    metricName: string;
    score: number;
    details?: Record<string, unknown>;
  }>;
  uid?: string;
};

export const mockLMEvaluation = ({
  name = 'test-lm-evaluation',
  namespace = 'test-project',
  modelName = 'test-model',
  evalDataset = 'mmlu',
  evalMetrics = ['accuracy', 'f1_score'],
  batchSize = 8,
  timeout = 3600,
  phase = 'Pending',
  completionTime,
  startTime = '2023-03-17T16:12:41Z',
  results = [],
  uid,
}: MockLMEvaluationConfigType = {}): LMEvaluationKind => ({
  apiVersion: 'lmeval.opendatahub.io/v1alpha1',
  kind: 'LMEvaluation',
  metadata: {
    name,
    namespace,
    uid: uid || genUID('lm-evaluation'),
    resourceVersion: '1309350',
    creationTimestamp: '2023-03-17T16:12:41Z',
    generation: 1,
    annotations: {
      'opendatahub.io/modified-date': '2023-03-17T16:12:41Z',
    },
  },
  spec: {
    modelName,
    evalDataset,
    evalMetrics,
    batchSize,
    timeout,
  },
  status: {
    phase,
    startTime,
    ...(completionTime && { completionTime }),
    conditions: [
      {
        type: 'Ready',
        status: phase === 'Succeeded' ? 'True' : 'False',
        lastTransitionTime: '2023-03-17T16:12:41Z',
        reason: phase === 'Succeeded' ? 'EvaluationCompleted' : 'EvaluationInProgress',
        message:
          phase === 'Succeeded' ? 'Evaluation completed successfully' : 'Evaluation in progress',
      },
    ],
    results,
  },
});
