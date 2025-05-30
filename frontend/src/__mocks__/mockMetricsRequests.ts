import { BaseMetricListResponse } from '#~/api';

type MockMetricsRequestType = {
  modelName?: string;
};

export const mockMetricsRequest = ({
  modelName = 'test-model',
}: MockMetricsRequestType): BaseMetricListResponse =>
  ({
    requests: [
      {
        id: '1580303a-b85b-4c58-9d09-95c3979eb1bd',
        request: {
          modelId: modelName,
          requestName: 'Loan acceptance',
          metricName: 'SPD',
          batchSize: 5000,
          protectedAttribute: 'customer_data_input-3',
          outcomeName: 'predict',
          privilegedAttribute: {
            type: 'DOUBLE',
            value: '[1]',
          },
          unprivilegedAttribute: {
            type: 'DOUBLE',
            value: '[0]',
          },
          favorableOutcome: {
            type: 'INT64',
            value: '[0]',
          },
          thresholdDelta: 0.1,
        },
      },
      {
        id: '46142e1e-5abb-44b4-941b-f7a2937fbc23',
        request: {
          modelId: modelName,
          requestName: 'Loan Acceptance 4',
          metricName: 'SPD',
          batchSize: 10000,
          protectedAttribute: 'customer_data_input-3',
          outcomeName: 'predict',
          privilegedAttribute: {
            type: 'DOUBLE',
            value: '[1]',
          },
          unprivilegedAttribute: {
            type: 'DOUBLE',
            value: '[0]',
          },
          favorableOutcome: {
            type: 'INT64',
            value: '[0]',
          },
          thresholdDelta: 0.4,
        },
      },
      {
        id: 'f00fcf0c-fe64-4e08-a35f-7f483aa5dc6d',
        request: {
          modelId: modelName,
          requestName: 'Loan acceptance 2 STRICT',
          metricName: 'DIR',
          batchSize: 50000,
          protectedAttribute: 'customer_data_input-3',
          outcomeName: 'predict',
          privilegedAttribute: {
            type: 'DOUBLE',
            value: '[1]',
          },
          unprivilegedAttribute: {
            type: 'DOUBLE',
            value: '[0]',
          },
          favorableOutcome: {
            type: 'INT64',
            value: '[0]',
          },
          thresholdDelta: 0.1,
        },
      },
      {
        id: 'c00135c3-61f8-4368-a365-8da89edf27bc',
        request: {
          modelId: modelName,
          requestName: 'Loan acceptance 2',
          metricName: 'DIR',
          batchSize: 50000,
          protectedAttribute: 'customer_data_input-3',
          outcomeName: 'predict',
          privilegedAttribute: {
            type: 'DOUBLE',
            value: '[1]',
          },
          unprivilegedAttribute: {
            type: 'DOUBLE',
            value: '[0]',
          },
          favorableOutcome: {
            type: 'INT64',
            value: '[0]',
          },
          thresholdDelta: 0.2,
        },
      },
    ],
  } as BaseMetricListResponse);
