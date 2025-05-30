import { JavaScriptValue } from 'google-protobuf/google/protobuf/struct_pb';
import { ROCCurveConfig } from '#~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import { ConfidenceMetric } from './types';

export const isConfidenceMetric = (obj: JavaScriptValue): obj is ConfidenceMetric =>
  typeof obj === 'object' &&
  obj !== null &&
  'confidenceThreshold' in obj &&
  'falsePositiveRate' in obj &&
  'recall' in obj &&
  typeof obj.confidenceThreshold === 'number' &&
  typeof obj.falsePositiveRate === 'number' &&
  typeof obj.recall === 'number';

export const buildRocCurveConfig = (
  confidenceMetricsArray: ConfidenceMetric[],
  index: number,
): ROCCurveConfig => ({
  index,
  data: confidenceMetricsArray.map((metric) => ({
    name: metric.confidenceThreshold.toString(),
    x: metric.falsePositiveRate,
    y: metric.recall,
    index,
  })),
});
