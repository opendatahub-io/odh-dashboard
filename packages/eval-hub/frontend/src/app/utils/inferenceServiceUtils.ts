import type { InferenceServiceItem } from '~/app/types';

const EVAL_COMPATIBLE_MODEL_FORMATS = new Set(['vLLM']);

export const isModelEvalCompatible = (is: InferenceServiceItem): boolean => {
  if (!is.modelFormatName) {
    return true;
  }
  return EVAL_COMPATIBLE_MODEL_FORMATS.has(is.modelFormatName);
};
