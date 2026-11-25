import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { applyDefaultScheduler, applyK8sNameAndNamespace } from '../model';

describe('applyDefaultScheduler', () => {
  it('should preserve a configured scheduler when llm-d is selected', () => {
    const scheduler = {
      config: {
        ref: {
          name: 'llm-scheduler-config',
          key: 'default-scheduler',
        },
      },
      template: {
        containers: [{ name: 'main', args: ['--grpc-port', '9002'] }],
      },
    };
    const service = mockLLMInferenceServiceK8sResource({ isLLMd: false });
    service.spec.router = { ...service.spec.router, scheduler };

    const result = applyDefaultScheduler(service, true);

    expect(result.spec.router?.scheduler).toEqual(scheduler);
  });

  it('should add an empty scheduler when llm-d is selected and none exists', () => {
    const service = mockLLMInferenceServiceK8sResource({ isLLMd: false });

    const result = applyDefaultScheduler(service, true);

    expect(result.spec.router?.scheduler).toEqual({});
  });

  it('should remove the scheduler when simple vLLM is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});

    const result = applyDefaultScheduler(service, false);

    expect(result.spec.router?.scheduler).toBeUndefined();
  });

  it('should remove the scheduler when no deployment method is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});

    const result = applyDefaultScheduler(service);

    expect(result.spec.router?.scheduler).toBeUndefined();
  });

  it('should not add a router when simple vLLM is selected', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    delete service.spec.router;

    const result = applyDefaultScheduler(service, false);

    expect(result.spec.router).toBeUndefined();
  });
});

describe('applyK8sNameAndNamespace', () => {
  it('should keep the name and namespace of a resource that already exists', () => {
    const service = mockLLMInferenceServiceK8sResource({ name: 'existing', modelName: 'existing' });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'other-project');

    expect(result.metadata.name).toBe('existing');
    expect(result.metadata.namespace).toBe('test-project');
    expect(result.spec.model.name).toBe('existing');
  });

  it('should apply the name and namespace to a resource that does not exist yet', () => {
    const service = mockLLMInferenceServiceK8sResource({
      name: 'from-yaml',
      modelName: 'from-yaml',
      isExistingResource: false,
    });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'other-project');

    expect(result.metadata.name).toBe('renamed');
    expect(result.metadata.namespace).toBe('other-project');
    // The served model name followed the resource name, so it follows the rename
    expect(result.spec.model.name).toBe('renamed');
  });

  it('should keep a served model name that was set apart from the resource name', () => {
    const service = mockLLMInferenceServiceK8sResource({
      name: 'from-yaml',
      modelName: 'facebook/opt-125m',
      isExistingResource: false,
    });

    const result = applyK8sNameAndNamespace(service, 'renamed', 'test-project');

    expect(result.metadata.name).toBe('renamed');
    expect(result.spec.model.name).toBe('facebook/opt-125m');
  });
});
