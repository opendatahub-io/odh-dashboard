import { Artifact, GetArtifactsByContextResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedScalarMetricArtifact = (noMetrics?: boolean): Artifact => ({
  id: 7,
  typeId: 17,
  type: 'system.Metrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/f0b586ba-3e7b-4369-8d48-592e83cbbf73/digit-classification/metrics',
  properties: {},
  customProperties: noMetrics
    ? {}
    : {
        accuracy: { doubleValue: 92 },
        displayName: { stringValue: 'metrics' },
      },
  state: 2,
  createTimeSinceEpoch: 1711765118976,
  lastUpdateTimeSinceEpoch: 1711765118976,
});

const mockedHtmlArtifact = (noMetrics?: boolean): Artifact => ({
  id: 18,
  typeId: 20,
  type: 'system.HTML',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/html_artifact',
  properties: {},
  customProperties: noMetrics
    ? {}
    : {
        displayName: { stringValue: 'html_artifact' },
      },
  state: 2,
  createTimeSinceEpoch: 1712841455267,
  lastUpdateTimeSinceEpoch: 1712841455267,
});

const mockedConfusionMatrixArtifact = (noMetrics?: boolean): Artifact => ({
  id: 8,
  typeId: 18,
  type: 'system.ClassificationMetrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/ccdfe85e-06cc-4a63-b10d-a12d688d2ec3/iris-sgdclassifier/metrics',
  properties: {},
  customProperties: noMetrics
    ? {}
    : {
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
});

const mockedRocCurveArtifact = (noMetrics?: boolean): Artifact => ({
  id: 9,
  typeId: 18,
  type: 'system.ClassificationMetrics',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/aa61378c-d507-4bde-aa18-9f8678b2beb6/wine-classification/metrics',
  properties: {},
  customProperties: noMetrics
    ? {}
    : {
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
});

const mockedMarkdownArtifact = (noMetrics?: boolean): Artifact => ({
  id: 16,
  typeId: 19,
  type: 'system.Markdown',
  uri: 's3://aballant-pipelines/metrics-visualization-pipeline/16dbff18-a3d5-4684-90ac-4e6198a9da0f/markdown-visualization/markdown_artifact',
  properties: {},
  customProperties: noMetrics
    ? {}
    : {
        displayName: { stringValue: 'markdown_artifact' },
      },
  state: 2,
  createTimeSinceEpoch: 1712841455267,
  lastUpdateTimeSinceEpoch: 1712841455267,
});

export const mockGetArtifactsByContext = (noMetrics?: boolean): GrpcResponse => {
  const binary = GetArtifactsByContextResponse.encode({
    artifacts: [
      mockedScalarMetricArtifact(noMetrics),
      mockedConfusionMatrixArtifact(noMetrics),
      mockedRocCurveArtifact(noMetrics),
      mockedMarkdownArtifact(noMetrics),
      mockedHtmlArtifact(noMetrics),
    ],
  }).finish();
  return createGrpcResponse(binary);
};
