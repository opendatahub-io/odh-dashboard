import { splitLlamaModelId } from '~/app/utilities/utils';

describe('splitLlamaModelId', () => {
  it('should split a valid model ID with provider and ID', () => {
    const result = splitLlamaModelId('vllm-inference-1/facebook-opt-1');
    expect(result).toEqual({
      providerId: 'vllm-inference-1',
      id: 'facebook-opt-1',
    });
  });

  it('should handle model ID without slash', () => {
    const result = splitLlamaModelId('facebook-opt-1');
    expect(result).toEqual({
      providerId: '',
      id: 'facebook-opt-1',
    });
  });

  it('should handle empty string', () => {
    const result = splitLlamaModelId('');
    expect(result).toEqual({
      providerId: '',
      id: '',
    });
  });

  it('should handle model ID with multiple slashes (only splits on first)', () => {
    const result = splitLlamaModelId('vllm-inference-1/facebook/opt-1');
    expect(result).toEqual({
      providerId: 'vllm-inference-1',
      id: 'facebook/opt-1',
    });
  });

  it('should handle complex provider and model names', () => {
    const result = splitLlamaModelId('anthropic-vertex/claude-3-opus-20240229');
    expect(result).toEqual({
      providerId: 'anthropic-vertex',
      id: 'claude-3-opus-20240229',
    });
  });

  it('should handle model ID with special characters', () => {
    const result = splitLlamaModelId('provider-123/model_name-v2.0');
    expect(result).toEqual({
      providerId: 'provider-123',
      id: 'model_name-v2.0',
    });
  });
});
