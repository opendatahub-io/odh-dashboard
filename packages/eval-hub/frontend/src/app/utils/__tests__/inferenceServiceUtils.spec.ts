import { isModelEvalCompatible } from '~/app/utils/inferenceServiceUtils';
import type { InferenceServiceItem } from '~/app/types';

describe('isModelEvalCompatible', () => {
  it('should return true for vLLM models', () => {
    const is: InferenceServiceItem = { name: 'llama', ready: true, modelFormatName: 'vLLM' };
    expect(isModelEvalCompatible(is)).toBe(true);
  });

  it('should return true when modelFormatName is not set', () => {
    const is: InferenceServiceItem = { name: 'unknown-model', ready: true };
    expect(isModelEvalCompatible(is)).toBe(true);
  });

  it('should return false for onnx models', () => {
    const is: InferenceServiceItem = { name: 'onnx-model', ready: true, modelFormatName: 'onnx' };
    expect(isModelEvalCompatible(is)).toBe(false);
  });

  it('should return false for tensorflow models', () => {
    const is: InferenceServiceItem = {
      name: 'tf-model',
      ready: true,
      modelFormatName: 'tensorflow',
    };
    expect(isModelEvalCompatible(is)).toBe(false);
  });

  it('should return false for pytorch models', () => {
    const is: InferenceServiceItem = {
      name: 'pytorch-model',
      ready: true,
      modelFormatName: 'pytorch',
    };
    expect(isModelEvalCompatible(is)).toBe(false);
  });

  it('should return false for sklearn models', () => {
    const is: InferenceServiceItem = {
      name: 'sklearn-model',
      ready: true,
      modelFormatName: 'sklearn',
    };
    expect(isModelEvalCompatible(is)).toBe(false);
  });
});
