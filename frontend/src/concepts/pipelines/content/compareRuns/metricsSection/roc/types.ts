import { ROCCurveConfig } from '#~/concepts/pipelines/content/artifacts/charts/ROCCurve';
import { FullArtifactPath } from '#~/concepts/pipelines/content/compareRuns/metricsSection/types';

export type ConfidenceMetric = {
  confidenceThreshold: number;
  falsePositiveRate: number;
  recall: number;
};

export type FullArtifactPathsAndConfig = {
  fullArtifactPath: FullArtifactPath;
  config: ROCCurveConfig;
};
