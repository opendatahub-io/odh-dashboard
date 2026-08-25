import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { applyNIMServingRuntimeShmMounts, removeNIMServingRuntimeResources } from '../utils';

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

  it('should not share the shm mount and volume between calls', () => {
    const first = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container' }]),
    );

    const [mount] = first.spec.containers[0].volumeMounts ?? [];
    const [volume] = first.spec.volumes ?? [];
    mount.mountPath = '/mutated';
    if (volume.emptyDir) {
      volume.emptyDir.sizeLimit = '99Gi';
    }

    const second = applyNIMServingRuntimeShmMounts(
      makeServingRuntime([{ name: 'kserve-container' }]),
    );

    expect(second.spec.containers[0].volumeMounts).toEqual([SHM_MOUNT]);
    expect(second.spec.volumes).toEqual([SHM_VOLUME]);
  });

  it('should not mutate the passed serving runtime', () => {
    const servingRuntime = makeServingRuntime([{ name: 'kserve-container' }]);

    applyNIMServingRuntimeShmMounts(servingRuntime);

    expect(servingRuntime.spec.containers[0].volumeMounts).toBeUndefined();
    expect(servingRuntime.spec.volumes).toBeUndefined();
  });
});

const CONTAINER_RESOURCES = {
  limits: { cpu: '0', memory: '0Gi' },
  requests: { cpu: '0', memory: '0Gi' },
};

describe('removeNIMServingRuntimeResources', () => {
  it('should drop the resources from every container', () => {
    const result = removeNIMServingRuntimeResources(
      makeServingRuntime([
        { name: 'transformer-container', resources: CONTAINER_RESOURCES },
        { name: 'kserve-container', resources: CONTAINER_RESOURCES },
      ]),
    );

    expect(result.spec.containers).toEqual([
      { name: 'transformer-container' },
      { name: 'kserve-container' },
    ]);
  });

  it('should keep the rest of the container untouched', () => {
    const result = removeNIMServingRuntimeResources(
      makeServingRuntime([
        {
          name: 'kserve-container',
          image: 'nvcr.io/nim/test:1.0.0',
          volumeMounts: [{ name: 'shm', mountPath: '/dev/shm' }],
          resources: CONTAINER_RESOURCES,
        },
      ]),
    );

    expect(result.spec.containers[0]).toEqual({
      name: 'kserve-container',
      image: 'nvcr.io/nim/test:1.0.0',
      volumeMounts: [{ name: 'shm', mountPath: '/dev/shm' }],
    });
  });

  it('should not mutate the passed serving runtime', () => {
    const servingRuntime = makeServingRuntime([
      { name: 'kserve-container', resources: CONTAINER_RESOURCES },
    ]);

    removeNIMServingRuntimeResources(servingRuntime);

    expect(servingRuntime.spec.containers[0].resources).toEqual(CONTAINER_RESOURCES);
  });
});
