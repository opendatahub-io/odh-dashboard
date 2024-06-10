import { Artifact, GetArtifactsByContextResponse } from '~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedScalarMetricArtifact: Artifact = {
  id: 7,
  typeId: 17,
  type: 'system.Metrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/f0b586ba-3e7b-4369-8d48-592e83cbbf73/digit-classification/metrics',
  properties: {},
  customProperties: {
    accuracy: { doubleValue: 92 },
    displayName: { stringValue: 'metrics' },
  },
  state: 2,
  createTimeSinceEpoch: 1711765118976,
  lastUpdateTimeSinceEpoch: 1711765118976,
};

const mockedConfusionMatrixArtifact: Artifact = {
  id: 8,
  typeId: 18,
  type: 'system.ClassificationMetrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/ccdfe85e-06cc-4a63-b10d-a12d688d2ec3/iris-sgdclassifier/metrics',
  properties: {},
  customProperties: {
    confusionMatrix: {
      structValue: {
        struct: {
          annotationSpecs: [
            { displayName: 'Setosa' },
            { displayName: 'Versicolour' },
            { displayName: 'Virginica' },
          ],
          rows: [
            {
              row: [38, 0, 0],
            },
            {
              row: [2, 19, 9],
            },
            {
              row: [1, 17, 19],
            },
          ],
        },
      },
    },
    displayName: {
      stringValue: 'metrics',
    },
  },
  state: 2,
  createTimeSinceEpoch: 1711765608345,
  lastUpdateTimeSinceEpoch: 1711765608345,
};

const mockedRocCurveArtifact: Artifact = {
  id: 9,
  typeId: 18,
  type: 'system.ClassificationMetrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/aa61378c-d507-4bde-aa18-9f8678b2beb6/wine-classification/metrics',
  properties: {},
  customProperties: {
    confidenceMetrics: {
      structValue: {
        list: [
          { confidenceThreshold: 2, falsePositiveRate: 0, recall: 0 },
          { confidenceThreshold: 1, falsePositiveRate: 0, recall: 0.33962264150943394 },
          { confidenceThreshold: 0, falsePositiveRate: 0, recall: 0.6037735849056604 },
          { confidenceThreshold: 0.8, falsePositiveRate: 0, recall: 0.8490566037735849 },
          { confidenceThreshold: 0.6, falsePositiveRate: 0, recall: 0.8867924528301887 },
          { confidenceThreshold: 0.5, falsePositiveRate: 0.0125, recall: 0.9245283018867925 },
          { confidenceThreshold: 0.4, falsePositiveRate: 0.075, recall: 0.9622641509433962 },
          { confidenceThreshold: 0.3, falsePositiveRate: 0.0875, recall: 1 },
          { confidenceThreshold: 0.2, falsePositiveRate: 0.2375, recall: 1 },
          { confidenceThreshold: 0.1, falsePositiveRate: 0.475, recall: 1 },
          { confidenceThreshold: 0, falsePositiveRate: 1, recall: 1 },
        ],
      },
    },
    displayName: {
      stringValue: 'metrics',
    },
  },
  state: 2,
  createTimeSinceEpoch: 1711766424068,
  lastUpdateTimeSinceEpoch: 1711766424068,
};

const mockedMarkdownArtifact: Artifact = {
  id: 16,
  typeId: 19,
  type: 'system.Markdown',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
  properties: {},
  customProperties: {
    displayName: { stringValue: 'markdown_artifact' },
  },
  state: 2,
  createTimeSinceEpoch: 1712841455267,
  lastUpdateTimeSinceEpoch: 1712841455267,
};

export const mockGetArtifactsByContext = (): GrpcResponse => {
  const binary = GetArtifactsByContextResponse.encode({
    artifacts: [
      mockedScalarMetricArtifact,
      mockedConfusionMatrixArtifact,
      mockedRocCurveArtifact,
      mockedMarkdownArtifact,
    ],
  }).finish();
  return createGrpcResponse(binary);
};
