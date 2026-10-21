import { mockNimServingRuntime } from '../../../__mocks__/mockLegacyNimResource';
import { isNIMServingRuntime, NIM_RUNTIME_STAMP_ANNOTATION } from '../nimUtils';

describe('isNIMServingRuntime', () => {
  it('should recognize the NIM image repository', () => {
    expect(isNIMServingRuntime(mockNimServingRuntime())).toBe(true);
  });
  it('should recognize a marked mirrored runtime', () => {
    const runtime = mockNimServingRuntime({ image: 'mirror.example/model:1' });
    runtime.metadata.annotations = { [NIM_RUNTIME_STAMP_ANNOTATION]: 'true' };
    expect(isNIMServingRuntime(runtime)).toBe(true);
  });
  it.each(['nvcr.io/nvidia/tritonserver:1', 'quay.io/example/model:1', ''])(
    'should not identify %s as NIM',
    (image) => {
      expect(isNIMServingRuntime(mockNimServingRuntime({ image }))).toBe(false);
    },
  );
  it('should ignore a NIM sidecar', () => {
    const runtime = mockNimServingRuntime({ image: 'quay.io/example/model:1' });
    runtime.spec.containers.push({ name: 'sidecar', image: 'nvcr.io/nim/example:1' });
    expect(isNIMServingRuntime(runtime)).toBe(false);
  });
  it('should handle missing runtime and containers', () => {
    expect(isNIMServingRuntime()).toBe(false);
    const runtime = mockNimServingRuntime();
    runtime.spec.containers = [];
    expect(isNIMServingRuntime(runtime)).toBe(false);
  });
});
