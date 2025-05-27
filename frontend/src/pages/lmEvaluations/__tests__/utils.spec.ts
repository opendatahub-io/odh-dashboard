import { LmEvaluationFormData } from '~/pages/lmEvaluations/types';
import { isFilledLmEvaluationFormData } from '~/pages/lmEvaluations/utils';

describe('isFilledLmEvaluationFormData', () => {
  it('should return true when all required fields are filled', () => {
    const validData: LmEvaluationFormData = {
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

    expect(isFilledLmEvaluationFormData(validData)).toBe(true);
  });

  it('should return false when tasks array is empty', () => {
    const invalidData: LmEvaluationFormData = {
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

    expect(isFilledLmEvaluationFormData(invalidData)).toBe(false);
  });

  it('should return false when model name is empty', () => {
    const invalidData: LmEvaluationFormData = {
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

    expect(isFilledLmEvaluationFormData(invalidData)).toBe(false);
  });

  it('should return false when model url is empty', () => {
    const invalidData: LmEvaluationFormData = {
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

    expect(isFilledLmEvaluationFormData(invalidData)).toBe(false);
  });

  it('should return false when model tokenizer is empty', () => {
    const invalidData: LmEvaluationFormData = {
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

    expect(isFilledLmEvaluationFormData(invalidData)).toBe(false);
  });
});
