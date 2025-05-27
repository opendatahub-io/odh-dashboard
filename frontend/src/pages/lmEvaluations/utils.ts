import { LmEvaluationFormData } from './types';

export const isFilledLmEvaluationFormData = (data: LmEvaluationFormData): boolean =>
  data.tasks.length > 0 && !!data.model.name && !!data.model.url && !!data.model.tokenizer;
