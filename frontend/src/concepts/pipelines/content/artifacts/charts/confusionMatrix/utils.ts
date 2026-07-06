import { ConfusionMatrixConfig, ConfusionMatrixInput } from './types';

export function buildConfusionMatrixConfig(
  confusionMatrix: ConfusionMatrixInput,
): ConfusionMatrixConfig {
  return {
    labels: confusionMatrix.annotationSpecs.map((annotation) => annotation.displayName),
    data: confusionMatrix.rows.map((x) => x.row),
  };
}
