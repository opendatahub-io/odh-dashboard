import { LmEvalFormData } from '#~/pages/lmEval/types';

export const isFilledLmEvalFormData = (data: LmEvalFormData): boolean =>
  data.tasks.length > 0 && !!data.model.name && !!data.model.url && !!data.model.tokenizer;
