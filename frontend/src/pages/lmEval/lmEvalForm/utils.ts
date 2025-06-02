import { LmEvalFormData, LmModelArgument } from './types';

export const isFilledLmEvalFormData = (data: LmEvalFormData): boolean =>
  data.tasks.length > 0 && !!data.model.name && !!data.model.url && !!data.model.tokenizer;

export const convertModelArgs = (modelArgs: LmModelArgument): { name: string; value: string }[] => [
  { name: 'model', value: modelArgs.name },
  { name: 'base_url', value: modelArgs.url },
  { name: 'num_concurrent', value: '1' },
  { name: 'max_retries', value: '3' },
  { name: 'tokenized_requests', value: modelArgs.tokenizedRequest.toString() },
  { name: 'tokenizer', value: modelArgs.tokenizer },
];
