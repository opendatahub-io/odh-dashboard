import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { applyNIMServingRuntimeShmMounts } from '../utils';

const makeServingRuntime = (
  containers: ServingRuntimeKind['spec']['containers'],
  volumes?: ServingRuntimeKind['spec']['volumes'],
): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: { name: 'nvidia-nim-runtime', namespace: 'test-project' },
  spec: { containers, ...(volumes && { volumes }) },
});

const SHM_MOUNT = { name: 'shm', mountPath: '/dev/shm' };
const SHM_VOLUME = { name: 'shm', emptyDir: { medium: 'Memory', sizeLimit: '2Gi' } };

describe('applyNIMServingRuntimeShmMounts', () => {
  it('should add the shm mount to a kserve-container that has no volumeMounts', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container', image: 'nvcr.io/nim/test:1.0.0' }]),
    );

    expect(result.spec.containers[0].volumeMounts).toEqual([SHM_MOUNT]);
  });

  it('should append the shm mount without dropping existing mounts', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([
        {
          name: 'kserve-container',
          volumeMounts: [{ name: 'model-storage', mountPath: '/mnt/models/cache' }],
        },
      ]),
    );

    expect(result.spec.containers[0].volumeMounts).toEqual([
      { name: 'model-storage', mountPath: '/mnt/models/cache' },
      SHM_MOUNT,
    ]);
  });

  it('should not add a duplicate shm mount', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container', volumeMounts: [SHM_MOUNT] }]),
    );

    expect(result.spec.containers[0].volumeMounts).toEqual([SHM_MOUNT]);
  });

  it('should leave containers other than kserve-container untouched', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'transformer-container' }, { name: 'kserve-container' }]),
    );

    expect(result.spec.containers[0].volumeMounts).toBeUndefined();
    expect(result.spec.containers[1].volumeMounts).toEqual([SHM_MOUNT]);
  });

  it('should add the shm volume when the runtime declares no volumes', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container' }]),
    );

    expect(result.spec.volumes).toEqual([SHM_VOLUME]);
  });

  it('should not add a duplicate shm volume', () => {
    const result = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container', volumeMounts: [SHM_MOUNT] }], [SHM_VOLUME]),
    );

    expect(result.spec.volumes).toEqual([SHM_VOLUME]);
  });

  it('should not mutate the passed serving runtime', () => {
    const servingRuntime = makeServingRuntime([{ name: 'kserve-container' }]);

    applyNIMServingRuntimeShmMounts(servingRuntime);

    expect(servingRuntime.spec.containers[0].volumeMounts).toBeUndefined();
    expect(servingRuntime.spec.volumes).toBeUndefined();
  });
});
