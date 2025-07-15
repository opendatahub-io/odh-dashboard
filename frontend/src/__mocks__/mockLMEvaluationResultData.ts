/* eslint-disable camelcase */
import { EvaluationResult } from '#~/pages/lmEval/lmEvalResult/LMEvalResultTable';

export const mockResults: EvaluationResult[] = [
  { task: 'hellaswag', metric: 'acc,none', value: 0.85432, error: 0.02156 },
  { task: 'hellaswag', metric: 'acc_norm,none', value: 0.76543, error: undefined },
  { task: 'arc_easy', metric: 'acc,none', value: 0.91234, error: 0.01234 },
  { task: 'arc_easy', metric: 'acc_norm,none', value: 0.89876, error: 0.00987 },
  { task: 'winogrande', metric: 'acc,none', value: 0.73456, error: undefined },
];

export const incompleteResults: EvaluationResult[] = [
  { task: 'test_task', metric: 'test_metric,none', value: 0.5 },
  { task: '', metric: 'empty_task,none', value: 0.75, error: 0.01 },
  { task: 'valid_task', metric: '', value: 0.25, error: undefined },
];

export const zeroResults: EvaluationResult[] = [
  { task: 'zero_task', metric: 'zero_metric,none', value: 0, error: 0 },
  { task: 'negative_task', metric: 'negative_metric,none', value: -0.12345, error: 0.00001 },
];

export const emptyResults: EvaluationResult[] = [];

export const mockRefresh = jest.fn().mockResolvedValue(undefined);

export const mockLMEvalContextValue = {
  lmEval: {
    data: [
      {
        apiVersion: 'trustyai.opendatahub.io/v1alpha1',
        kind: 'LMEvalJob',
        metadata: { name: 'test-evaluation', namespace: 'test-project' },
        spec: {
          model: 'test-model',
          taskList: {
            taskNames: ['arc_challenge'],
          },
        },
        status: {
          results: JSON.stringify({
            results: {
              arc_challenge: {
                alias: 'arc_challenge',
                'acc,none': 0.85,
                'acc_stderr,none': 0.02,
                'acc_norm,none': 0.73,
              },
            },
          }),
        },
      },
      {
        apiVersion: 'trustyai.opendatahub.io/v1alpha1',
        kind: 'LMEvalJob',
        metadata: { name: 'another-evaluation', namespace: 'test-project' },
        spec: {
          model: 'another-model',
          taskList: {
            taskNames: ['arc_easy'],
          },
        },
        status: {
          results: JSON.stringify({
            results: {
              arc_easy: {
                alias: 'arc_easy',
                'acc,none': 0.91,
              },
            },
          }),
        },
      },
    ],
    loaded: true,
    error: undefined,
    refresh: mockRefresh,
  },
  project: null,
  preferredProject: null,
  projects: null,
};

export const mockParsedResults = [
  { task: 'arc_challenge', metric: 'acc,none', value: 0.85, error: 0.02 },
  { task: 'arc_challenge', metric: 'acc_norm,none', value: 0.73, error: undefined },
];

export const mockLMEvalContextWithNoResults = {
  ...mockLMEvalContextValue,
  lmEval: {
    ...mockLMEvalContextValue.lmEval,
    data: [
      {
        apiVersion: 'trustyai.opendatahub.io/v1alpha1',
        kind: 'LMEvalJob',
        metadata: { name: 'test-evaluation', namespace: 'test-project' },
        spec: {
          model: 'test-model',
          taskList: {
            taskNames: ['task1'],
          },
        },
        status: {}, // No results
      },
    ],
  },
};

export const mockLMEvalContextWithInvalidJSON = {
  ...mockLMEvalContextValue,
  lmEval: {
    ...mockLMEvalContextValue.lmEval,
    data: [
      {
        apiVersion: 'trustyai.opendatahub.io/v1alpha1',
        kind: 'LMEvalJob',
        metadata: { name: 'test-evaluation', namespace: 'test-project' },
        spec: {
          model: 'test-model',
          taskList: {
            taskNames: ['task1'],
          },
        },
        status: {
          results: 'invalid json string',
        },
      },
    ],
  },
};

export const mockLMEvalContextWithError = {
  ...mockLMEvalContextValue,
  lmEval: {
    ...mockLMEvalContextValue.lmEval,
    error: new Error('Load failed'),
  },
};
