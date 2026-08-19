import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import {
  NIMPVCStorageMode,
  type NIMPVCFieldValue,
} from '../../../pages/deploymentWizard/fields/NIMPVCField';
import {
  DEFAULT_STORAGE_SIZE_GI,
  KSERVE_CONTAINER_NAME,
  NIM_CACHE_MOUNT_PATH,
  NIM_TEMPLATE_PVC_NAME,
} from '../../../constants';
import { applyNIMPVCFieldData, extractNIMPVCFieldData } from '../nimPVCApplyExtract';

const makeServingRuntime = (
  overrides?: Partial<ServingRuntimeKind['spec']>,
): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: { name: 'test-nim', namespace: 'test-project' },
  spec: {
    containers: [{ name: 'kserve-container' }],
    supportedModelFormats: [{ name: 'test-model', version: '1' }],
    ...overrides,
  },
});

const makeDeployment = (server?: ServingRuntimeKind): KServeDeployment => ({
  modelServingPlatformId: 'nvidia-nim',
  model: mockInferenceServiceK8sResource({ name: 'test-nim' }),
  server,
});

const makeFieldValue = (overrides?: Partial<NIMPVCFieldValue>): NIMPVCFieldValue => ({
  storageMode: NIMPVCStorageMode.NEW,
  pvcName: 'my-nim-pvc',
  subPath: '',
  storageClassName: 'gp3-csi',
  storageSizeGi: DEFAULT_STORAGE_SIZE_GI,
  ...overrides,
});

describe('applyNIMPVCFieldData', () => {
  it('should return deployment unchanged when there is no server', () => {
    const deployment = makeDeployment();
    const result = applyNIMPVCFieldData(deployment, makeFieldValue());
    expect(result.server).toBeUndefined();
  });

  it('should add a PVC volume to the serving runtime', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ pvcName: 'nim-cache' }),
    );
    expect(result.server?.spec.volumes).toContainEqual({
      name: 'nim-cache',
      persistentVolumeClaim: { claimName: 'nim-cache' },
    });
  });

  it('should add a volume mount to the kserve-container', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ pvcName: 'nim-cache' }),
    );
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    expect(container?.volumeMounts).toContainEqual(
      expect.objectContaining({
        name: 'nim-cache',
        mountPath: '/mnt/models/cache',
      }),
    );
  });

  it('should set NIM_CACHE_PATH env var on the kserve-container', () => {
    const result = applyNIMPVCFieldData(makeDeployment(makeServingRuntime()), makeFieldValue());
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    expect(container?.env).toContainEqual({
      name: 'NIM_CACHE_PATH',
      value: '/mnt/models/cache',
    });
  });

  it('should omit subPath when it is empty', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ subPath: '' }),
    );
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    const mount = container?.volumeMounts?.find((vm) => vm.mountPath === '/mnt/models/cache');
    expect(mount?.subPath).toBeUndefined();
  });

  it('should strip leading slashes from subPath', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ subPath: '/models/llama' }),
    );
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    const mount = container?.volumeMounts?.find((vm) => vm.mountPath === '/mnt/models/cache');
    expect(mount?.subPath).toBe('models/llama');
  });

  it('should strip "/" to undefined (same as empty)', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ subPath: '/' }),
    );
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    const mount = container?.volumeMounts?.find((vm) => vm.mountPath === '/mnt/models/cache');
    expect(mount?.subPath).toBeUndefined();
  });

  it('should translate display names with spaces into valid k8s names', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(makeServingRuntime()),
      makeFieldValue({ pvcName: 'pr pvc test' }),
    );
    expect(result.server?.spec.volumes).toContainEqual({
      name: 'pr-pvc-test',
      persistentVolumeClaim: { claimName: 'pr-pvc-test' },
    });
    const container = result.server?.spec.containers.find((c) => c.name === 'kserve-container');
    expect(container?.volumeMounts).toContainEqual(
      expect.objectContaining({
        name: 'pr-pvc-test',
        mountPath: '/mnt/models/cache',
      }),
    );
  });

  it('should preserve existing volumes', () => {
    const runtime = makeServingRuntime({
      volumes: [{ name: 'shm', emptyDir: {} }],
    });
    const result = applyNIMPVCFieldData(
      makeDeployment(runtime),
      makeFieldValue({ pvcName: 'nim-cache' }),
    );
    expect(result.server?.spec.volumes).toHaveLength(2);
    expect(result.server?.spec.volumes?.[0]).toEqual({ name: 'shm', emptyDir: {} });
  });

  it('should replace the template placeholder nim-pvc volume', () => {
    const runtime = makeServingRuntime({
      containers: [
        {
          name: KSERVE_CONTAINER_NAME,
          volumeMounts: [{ name: NIM_TEMPLATE_PVC_NAME, mountPath: NIM_CACHE_MOUNT_PATH }],
        },
      ],
      volumes: [
        {
          name: NIM_TEMPLATE_PVC_NAME,
          persistentVolumeClaim: { claimName: NIM_TEMPLATE_PVC_NAME },
        },
        { name: 'shm', emptyDir: {} },
      ],
    });
    const result = applyNIMPVCFieldData(
      makeDeployment(runtime),
      makeFieldValue({ pvcName: 'pr pvc test' }),
    );
    expect(result.server?.spec.volumes).toEqual([
      { name: 'shm', emptyDir: {} },
      { name: 'pr-pvc-test', persistentVolumeClaim: { claimName: 'pr-pvc-test' } },
    ]);
    const container = result.server?.spec.containers.find((c) => c.name === KSERVE_CONTAINER_NAME);
    expect(container?.volumeMounts).toEqual([
      { name: 'pr-pvc-test', mountPath: NIM_CACHE_MOUNT_PATH },
    ]);
  });

  it('should replace an existing volume with the same PVC claim', () => {
    const runtime = makeServingRuntime({
      volumes: [
        { name: 'nim-cache', persistentVolumeClaim: { claimName: 'nim-cache' } },
        { name: 'shm', emptyDir: {} },
      ],
    });
    const result = applyNIMPVCFieldData(
      makeDeployment(runtime),
      makeFieldValue({ pvcName: 'nim-cache' }),
    );
    const pvcVolumes = result.server?.spec.volumes?.filter(
      (v) => v.persistentVolumeClaim?.claimName === 'nim-cache',
    );
    expect(pvcVolumes).toHaveLength(1);
  });

  it('should not modify other containers', () => {
    const runtime = makeServingRuntime({
      containers: [{ name: 'sidecar' }, { name: 'kserve-container' }],
    });
    const result = applyNIMPVCFieldData(makeDeployment(runtime), makeFieldValue());
    const sidecar = result.server?.spec.containers.find((c) => c.name === 'sidecar');
    expect(sidecar?.volumeMounts).toBeUndefined();
    expect(sidecar?.env).toBeUndefined();
  });

  it('should not mutate the original deployment', () => {
    const runtime = makeServingRuntime();
    const deployment = makeDeployment(runtime);
    applyNIMPVCFieldData(deployment, makeFieldValue());
    expect(runtime.spec.volumes).toBeUndefined();
    expect(runtime.spec.containers[0].volumeMounts).toBeUndefined();
  });
});

describe('extractNIMPVCFieldData', () => {
  it('should return undefined when there is no server', () => {
    expect(extractNIMPVCFieldData(makeDeployment())).toBeUndefined();
  });

  it('should return undefined when there is no cache volume mount', () => {
    expect(extractNIMPVCFieldData(makeDeployment(makeServingRuntime()))).toBeUndefined();
  });

  it('should return undefined when volume mount has no matching PVC volume', () => {
    const runtime = makeServingRuntime({
      containers: [
        {
          name: 'kserve-container',
          volumeMounts: [{ name: 'some-vol', mountPath: '/mnt/models/cache' }],
        },
      ],
      volumes: [{ name: 'some-vol', emptyDir: {} }],
    });
    expect(extractNIMPVCFieldData(makeDeployment(runtime))).toBeUndefined();
  });

  it('should extract PVC data from a configured runtime', () => {
    const runtime = makeServingRuntime({
      containers: [
        {
          name: 'kserve-container',
          volumeMounts: [{ name: 'nim-cache', mountPath: '/mnt/models/cache', subPath: 'models' }],
        },
      ],
      volumes: [{ name: 'nim-cache', persistentVolumeClaim: { claimName: 'nim-cache' } }],
    });
    const result = extractNIMPVCFieldData(makeDeployment(runtime));
    expect(result).toEqual({
      storageMode: NIMPVCStorageMode.EXISTING,
      pvcName: 'nim-cache',
      subPath: 'models',
      storageClassName: '',
      storageSizeGi: DEFAULT_STORAGE_SIZE_GI,
    });
  });

  it('should default subPath to empty string when not set', () => {
    const runtime = makeServingRuntime({
      containers: [
        {
          name: 'kserve-container',
          volumeMounts: [{ name: 'nim-cache', mountPath: '/mnt/models/cache' }],
        },
      ],
      volumes: [{ name: 'nim-cache', persistentVolumeClaim: { claimName: 'nim-cache' } }],
    });
    const result = extractNIMPVCFieldData(makeDeployment(runtime));
    expect(result?.subPath).toBe('');
  });
});
