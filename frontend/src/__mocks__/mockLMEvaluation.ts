import { LMEvalKind } from '#~/k8sTypes';

type MockLMEvaluationConfigType = {
  name?: string;
  namespace?: string;
  creationTimestamp?: string;
  model?: string;
  taskNames?: string[];
  batchSize?: string;
  timeout?: number;
  allowCodeExecution?: boolean;
  allowOnline?: boolean;
  logSamples?: boolean;
  modelArgs?: { name: string; value: string }[];
  state?: string;
  message?: string;
  reason?: string;
  results?: string;
  podName?: string;
  completeTime?: string;
  lastScheduleTime?: string;
};

export const mockLMEvaluation = (config: MockLMEvaluationConfigType = {}): LMEvalKind => {
  const {
    name = 'test-lm-evaluation',
    namespace = 'test-project',
    creationTimestamp = '2024-01-15T10:00:00Z',
    model = 'test-model',
    taskNames = ['mmlu', 'hellaswag'],
    batchSize = '8',
    allowCodeExecution = false,
    allowOnline = false,
    logSamples = false,
    modelArgs = [{ name: 'model', value: 'test-model' }],
    state = 'Pending',
    message = 'Evaluation is pending',
    reason = 'EvaluationPending',
    results = Object.prototype.hasOwnProperty.call(config, 'results')
      ? config.results
      : '{"mmlu": {"accuracy": 0.85}, "hellaswag": {"accuracy": 0.78}}',
    podName = Object.prototype.hasOwnProperty.call(config, 'podName')
      ? config.podName
      : 'test-lm-evaluation-pod-12345',
    completeTime = Object.prototype.hasOwnProperty.call(config, 'completeTime')
      ? config.completeTime
      : '2024-01-15T10:30:00Z',
    lastScheduleTime = Object.prototype.hasOwnProperty.call(config, 'lastScheduleTime')
      ? config.lastScheduleTime
      : '2024-01-15T10:00:00Z',
  } = config;

  return {
    apiVersion: 'trustyai.opendatahub.io/v1alpha1',
    kind: 'LMEvalJob',
    metadata: {
      name,
      namespace,
      creationTimestamp,
    },
    spec: {
      model,
      taskList: {
        taskNames,
      },
      batchSize,
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
  };
};
