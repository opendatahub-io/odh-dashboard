export type OptimizationMetric = 'faithfulness' | 'answer_relevancy' | 'context_precision';

export type ExperimentSettings = {
  selectedFoundationModelIds: string[];
  selectedEmbeddingModelIds: string[];
  optimizationMetric: OptimizationMetric;
  maxRagPatterns: number;
};
