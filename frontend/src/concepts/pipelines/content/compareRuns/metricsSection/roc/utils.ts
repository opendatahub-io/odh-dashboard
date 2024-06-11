import { JavaScriptValue } from 'google-protobuf/google/protobuf/struct_pb';
import { ROCCurveConfig } from '~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import { ConfidenceMetric } from './types';

export const isConfidenceMetric = (obj: JavaScriptValue): obj is ConfidenceMetric => {
  const metric = obj as ConfidenceMetric;
  return (
    typeof metric.confidenceThreshold === 'number' &&
    typeof metric.falsePositiveRate === 'number' &&
    typeof metric.recall === 'number'
  );
};

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
