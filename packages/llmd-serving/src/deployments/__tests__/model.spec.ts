import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { applyDefaultScheduler } from '../model';

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
});
