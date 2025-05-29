import { LmEvalFormData } from '~/pages/lmEval/types';
import { isFilledLmEvalFormData } from '~/pages/lmEval/utils';

describe('isFilledLmEvaluationFormData', () => {
  it('should return true when all required fields are filled', () => {
    const validData: LmEvalFormData = {
      deployedModelName: 'test-model',
      evaluationName: 'test-evaluation',
      tasks: ['task1', 'task2'],
      modelType: 'local-chat-completion',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: 'test-model',
        url: 'http://test.com',
        tokenizedRequest: false,
        tokenizer: 'test-tokenizer',
      },
    };

    expect(isFilledLmEvalFormData(validData)).toBe(true);
  });

  it('should return false when tasks array is empty', () => {
    const invalidData: LmEvalFormData = {
      deployedModelName: 'test-model',
      evaluationName: 'test-evaluation',
      tasks: [],
      modelType: 'local-chat-completion',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: 'test-model',
        url: 'http://test.com',
        tokenizedRequest: false,
        tokenizer: 'test-tokenizer',
      },
    };

    expect(isFilledLmEvalFormData(invalidData)).toBe(false);
  });

  it('should return false when model name is empty', () => {
    const invalidData: LmEvalFormData = {
      deployedModelName: 'test-model',
      evaluationName: 'test-evaluation',
      tasks: ['task1'],
      modelType: 'local-chat-completion',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: '',
        url: 'http://test.com',
        tokenizedRequest: false,
        tokenizer: 'test-tokenizer',
      },
    };

    expect(isFilledLmEvalFormData(invalidData)).toBe(false);
  });

  it('should return false when model url is empty', () => {
    const invalidData: LmEvalFormData = {
      deployedModelName: 'test-model',
      evaluationName: 'test-evaluation',
      tasks: ['task1'],
      modelType: 'local-chat-completion',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: 'test-model',
        url: '',
        tokenizedRequest: false,
        tokenizer: 'test-tokenizer',
      },
    };

    expect(isFilledLmEvalFormData(invalidData)).toBe(false);
  });

  it('should return false when model tokenizer is empty', () => {
    const invalidData: LmEvalFormData = {
      deployedModelName: 'test-model',
      evaluationName: 'test-evaluation',
      tasks: ['task1'],
      modelType: 'local-chat-completion',
      allowRemoteCode: false,
      allowOnline: false,
      model: {
        name: 'test-model',
        url: 'http://test.com',
        tokenizedRequest: false,
        tokenizer: '',
      },
    };

    expect(isFilledLmEvalFormData(invalidData)).toBe(false);
  });
});
