import { ConfusionMatrixConfig } from '#~/concepts/pipelines/content/artifacts/charts/confusionMatrix/types';

export type ConfusionMatrixConfigAndTitle = {
  title: string;
  config: ConfusionMatrixConfig;
};
