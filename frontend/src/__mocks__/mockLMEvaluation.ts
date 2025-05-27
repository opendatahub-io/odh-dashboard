import { LMEvaluationKind } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';

type MockLMEvaluationConfigType = {
  name?: string;
  namespace?: string;
  model?: string;
  taskNames?: string[];
  batchSize?: string;
  timeout?: number;
  allowCodeExecution?: boolean;
  allowOnline?: boolean;
  logSamples?: boolean;
  modelArgs?: string[];
  state?: string;
  message?: string;
  reason?: string;
  results?: string;
  podName?: string;
  completeTime?: string;
  lastScheduleTime?: string;
  uid?: string;
};

export const mockLMEvaluation = ({
  name = 'test-lm-evaluation',
  namespace = 'test-project',
  model = 'test-model',
  taskNames = ['mmlu', 'hellaswag'],
  batchSize = '8',
  timeout = 3600,
  allowCodeExecution = false,
  allowOnline = false,
  logSamples = false,
  modelArgs = [],
  state = 'Pending',
  message = 'Evaluation is pending',
  reason = 'EvaluationPending',
  results,
  podName,
  completeTime,
  lastScheduleTime,
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
    model,
    taskList: {
      taskNames,
    },
    batchSize,
    timeout,
    allowCodeExecution,
    allowOnline,
    logSamples,
    modelArgs,
  },
  status: {
    state,
    message,
    reason,
    ...(results && { results }),
    ...(podName && { podName }),
    ...(completeTime && { completeTime }),
    ...(lastScheduleTime && { lastScheduleTime }),
  },
});
