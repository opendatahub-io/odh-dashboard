/* eslint-disable camelcase */

import { DataSet, DataSetList } from '../types/dataSets';

/* eslint-disable @typescript-eslint/naming-convention */
export const mockDataSet = (overrides: Partial<DataSet> = {}): DataSet => ({
  spec: {
    description: 'Sample dataset for testing',
    name: 'test_dataset',
    features: ['feature1', 'feature2'],
    joinKeys: ['user_id'],
    storage: {
      fileStorage: {
        fileFormat: {
          parquetFormat: {},
        },
        uri: 's3://bucket/path/to/dataset.parquet',
      },
    },
    tags: {
      environment: 'test',
      team: 'data-science',
    },
    featureServiceName: 'test-feature-service',
  },
  meta: {
    createdTimestamp: '2025-01-15T10:30:00.000000Z',
    lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
    maxEventTimestamp: '2025-01-15T10:30:00.000000Z',
    minEventTimestamp: '2025-01-01T00:00:00.000000Z',
  },
  project: 'test-project',
  ...overrides,
});

/* eslint-disable @typescript-eslint/naming-convention */
export const mockDataSets = ({
  savedDatasets = [
    mockDataSet(),
    mockDataSet({
      spec: {
        ...mockDataSet().spec,
        name: 'credit_scoring_dataset',
        description: 'Dataset for credit scoring model',
        storage: {
          bigqueryStorage: {
            table: 'credit_scoring_features',
          },
        },
        tags: {
          domain: 'finance',
          model: 'credit-scoring',
          environment: 'production',
        },
        featureServiceName: 'credit-scoring-service',
      },
      project: 'credit_scoring_local',
    }),
    mockDataSet({
      spec: {
        ...mockDataSet().spec,
        name: 'fraud_detection_dataset',
        description: 'Dataset for fraud detection',
        storage: {
          redshiftStorage: {
            table: 'fraud_features',
            schema: 'analytics',
            database: 'data_warehouse',
          },
        },
        tags: {
          domain: 'security',
          model: 'fraud-detection',
          priority: 'high',
        },
        featureServiceName: 'fraud-detection-service',
      },
      project: 'fraud_detection',
    }),
  ],
  pagination = {
    page: 1,
    limit: 50,
    total_count: 3,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
  relationships = {
    test_dataset: [
      {
        source: { type: 'feature', name: 'feature1' },
        target: { type: 'dataSet', name: 'test_dataset' },
      },
      {
        source: { type: 'feature', name: 'feature2' },
        target: { type: 'dataSet', name: 'test_dataset' },
      },
    ],
    credit_scoring_dataset: [
      {
        source: { type: 'feature', name: 'credit_score' },
        target: { type: 'dataSet', name: 'credit_scoring_dataset' },
      },
      {
        source: { type: 'feature', name: 'income' },
        target: { type: 'dataSet', name: 'credit_scoring_dataset' },
      },
    ],
    fraud_detection_dataset: [
      {
        source: { type: 'feature', name: 'transaction_amount' },
        target: { type: 'dataSet', name: 'fraud_detection_dataset' },
      },
      {
        source: { type: 'feature', name: 'location' },
        target: { type: 'dataSet', name: 'fraud_detection_dataset' },
      },
    ],
  },
}: Partial<DataSetList> = {}): DataSetList => ({
  savedDatasets,
  pagination,
  relationships,
});
