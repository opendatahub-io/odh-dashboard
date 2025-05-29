import { LmEvalFormData } from './types';

export const isFilledLmEvalFormData = (data: LmEvalFormData): boolean =>
  data.tasks.length > 0 && !!data.model.name && !!data.model.url && !!data.model.tokenizer;
