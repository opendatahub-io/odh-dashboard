import type { PipelineRun } from '~/app/types';

/**
 * Gets the optimized metric for AutoRAG from pipeline parameters.
 * @param pipelineRun - The pipeline run object containing parameters
 * @returns The optimized metric name from parameters, or 'faithfulness' as default
 */
export function getOptimizedMetricForRAG(pipelineRun?: PipelineRun): string {
  const parameters = pipelineRun?.runtime_config?.parameters;
  if (parameters && 'optimization_metric' in parameters) {
    const metric = parameters.optimization_metric;
    if (typeof metric === 'string') {
      return metric;
    }
  }
  return 'faithfulness';
}
