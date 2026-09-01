import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import {
  applyNIMServingRuntimeCredentials,
  applyNIMServingRuntimeShmMounts,
  removeNIMServingRuntimeResources,
} from '../utils';

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

describe('applyNIMServingRuntimeCredentials', () => {
  const makeNIMAccount = () => {
    const account = mockNimAccount({
      namespace: 'test-project',
      apiKeySecretName: 'project-nim-api-key',
    });
    account.status = {
      ...account.status,
      nimPullSecret: { name: 'project-nim-pull-secret' },
    };
    return account;
  };

  it('should replace NIM credential placeholders while preserving unrelated references', () => {
    const runtime = makeServingRuntime([
      {
        name: 'kserve-container',
        env: [
          {
            name: 'NGC_API_KEY',
            valueFrom: { secretKeyRef: { name: 'nvidia-nim-secrets', key: 'NGC_API_KEY' } },
          },
          {
            name: 'UNRELATED_SECRET',
            valueFrom: { secretKeyRef: { name: 'unrelated-secret', key: 'token' } },
          },
        ],
      },
      {
        name: 'sidecar',
        env: [
          {
            name: 'NGC_API_KEY',
            valueFrom: { secretKeyRef: { name: 'nvidia-nim-secrets', key: 'NGC_API_KEY' } },
          },
        ],
      },
    ]);
    runtime.spec.imagePullSecrets = [{ name: 'ngc-secret' }, { name: 'unrelated-pull-secret' }];

    const result = applyNIMServingRuntimeCredentials(runtime, makeNIMAccount());

    expect(result.spec.containers[0].env).toEqual([
      {
        name: 'NGC_API_KEY',
        valueFrom: { secretKeyRef: { name: 'project-nim-api-key', key: 'NGC_API_KEY' } },
      },
      {
        name: 'UNRELATED_SECRET',
        valueFrom: { secretKeyRef: { name: 'unrelated-secret', key: 'token' } },
      },
    ]);
    expect(result.spec.containers[1].env?.[0].valueFrom?.secretKeyRef?.name).toBe(
      'project-nim-api-key',
    );
    expect(result.spec.imagePullSecrets).toEqual([
      { name: 'project-nim-pull-secret' },
      { name: 'unrelated-pull-secret' },
    ]);
  });

  it('should not mutate the input ServingRuntime', () => {
    const runtime = makeServingRuntime([
      {
        name: 'kserve-container',
        env: [
          {
            name: 'NGC_API_KEY',
            valueFrom: { secretKeyRef: { name: 'nvidia-nim-secrets', key: 'NGC_API_KEY' } },
          },
        ],
      },
    ]);
    runtime.spec.imagePullSecrets = [{ name: 'ngc-secret' }];

    applyNIMServingRuntimeCredentials(runtime, makeNIMAccount());

    expect(runtime.spec.containers[0].env?.[0].valueFrom?.secretKeyRef?.name).toBe(
      'nvidia-nim-secrets',
    );
    expect(runtime.spec.imagePullSecrets).toEqual([{ name: 'ngc-secret' }]);
  });

  it('should leave runtimes without NIM credential placeholders unchanged', () => {
    const runtime = makeServingRuntime([
      {
        name: 'kserve-container',
        env: [{ name: 'UNRELATED', valueFrom: { secretKeyRef: { name: 'other', key: 'key' } } }],
      },
    ]);
    runtime.spec.imagePullSecrets = [{ name: 'other-pull-secret' }];

    expect(applyNIMServingRuntimeCredentials(runtime, makeNIMAccount())).toEqual(runtime);
  });
});

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
