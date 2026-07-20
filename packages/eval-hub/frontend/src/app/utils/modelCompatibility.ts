import type { InferenceServiceItem } from '~/app/types';

/**
 * Model formats known to serve OpenAI-compatible chat/completions endpoints.
 * Expand this set as new LLM serving runtimes are added.
 */
const EVAL_COMPATIBLE_FORMATS = new Set(['vllm', 'tgis', 'huggingface', 'caikit', 'openvino']);

/**
 * Returns true when we can determine that a model is compatible with
 * evaluation benchmarks (i.e. it serves an OpenAI-compatible endpoint).
 *
 * When `model_format_name` is absent we treat the model as compatible
 * to avoid blocking legacy deployments that pre-date the field.
 */
export const isEvalCompatibleModel = (is: InferenceServiceItem): boolean => {
  if (!is.model_format_name) {
    return true;
  }
  return EVAL_COMPATIBLE_FORMATS.has(is.model_format_name.toLowerCase());
};

export const getIncompatibleModelReason = (is: InferenceServiceItem): string | undefined => {
  if (!is.ready) {
    return 'This model is unavailable. Check the model\u2019s deployment status.';
  }
  if (!isEvalCompatibleModel(is)) {
    return `Model format "${is.model_format_name}" is not compatible with evaluation benchmarks. Evaluations require an OpenAI-compatible chat/completions endpoint (e.g. vLLM, TGIS).`;
  }
  return undefined;
};
