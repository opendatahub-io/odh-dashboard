import { NIMPVCStorageMode } from '../NIMPVCField';
import type { NIMDeployment } from '../../../../api/nimservices/types';
import type { NIMPVCFieldValue } from '../NIMPVCField';
import { applyNIMPVCFieldData, extractNIMPVCFieldData } from '../nimPVCApplyExtract';

const makeDeployment = (pvcName?: string, subPath?: string): NIMDeployment => ({
  modelServingPlatformId: 'nvidia-nim',
  model: {
    apiVersion: 'apps.nvidia.com/v1alpha1',
    kind: 'NIMService',
    metadata: { name: 'test', namespace: 'ns' },
    spec: {
      image: { repository: 'nvcr.io/nim/test' },
      ...(pvcName && {
        storage: {
          pvc: {
            name: pvcName,
            ...(subPath && { subPath }),
          },
        },
      }),
    },
  },
});

const makeFieldValue = (overrides?: Partial<NIMPVCFieldValue>): NIMPVCFieldValue => ({
  storageMode: NIMPVCStorageMode.NEW,
  pvcName: 'test-pvc',
  subPath: '',
  storageClassName: 'gp3-csi',
  storageSizeGi: 50,
  ...overrides,
});

describe('applyNIMPVCFieldData', () => {
  it('should set PVC name on the deployment', () => {
    const result = applyNIMPVCFieldData(makeDeployment(), makeFieldValue({ pvcName: 'my-pvc' }));
    expect(result.model.spec.storage?.pvc?.name).toBe('my-pvc');
  });

  it('should omit subPath when it is empty (default)', () => {
    const result = applyNIMPVCFieldData(makeDeployment(), makeFieldValue({ subPath: '' }));
    expect(result.model.spec.storage?.pvc?.subPath).toBeUndefined();
  });

  it('should strip leading slash from "/" leaving it omitted', () => {
    const result = applyNIMPVCFieldData(makeDeployment(), makeFieldValue({ subPath: '/' }));
    expect(result.model.spec.storage?.pvc?.subPath).toBeUndefined();
  });

  it('should strip leading slash from subPath', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(),
      makeFieldValue({ subPath: '/models/llama' }),
    );
    expect(result.model.spec.storage?.pvc?.subPath).toBe('models/llama');
  });

  it('should strip multiple leading slashes from subPath', () => {
    const result = applyNIMPVCFieldData(makeDeployment(), makeFieldValue({ subPath: '//models' }));
    expect(result.model.spec.storage?.pvc?.subPath).toBe('models');
  });

  it('should keep relative subPath as-is', () => {
    const result = applyNIMPVCFieldData(
      makeDeployment(),
      makeFieldValue({ subPath: 'models/llama' }),
    );
    expect(result.model.spec.storage?.pvc?.subPath).toBe('models/llama');
  });

  it('should not mutate the original deployment', () => {
    const deployment = makeDeployment();
    applyNIMPVCFieldData(deployment, makeFieldValue({ pvcName: 'changed' }));
    expect(deployment.model.spec.storage).toBeUndefined();
  });
});

describe('extractNIMPVCFieldData', () => {
  it('should extract PVC data from deployment', () => {
    const result = extractNIMPVCFieldData(makeDeployment('my-pvc', 'models'));
    expect(result).toEqual({
      storageMode: NIMPVCStorageMode.EXISTING,
      pvcName: 'my-pvc',
      subPath: 'models',
      storageClassName: '',
      storageSizeGi: 50,
    });
  });

  it('should return undefined when no PVC is configured', () => {
    expect(extractNIMPVCFieldData(makeDeployment())).toBeUndefined();
  });

  it('should parse size with Gi unit', () => {
    const deployment = makeDeployment('my-pvc');
    deployment.model.spec.storage = { pvc: { name: 'my-pvc', size: '64Gi' } };
    const result = extractNIMPVCFieldData(deployment);
    expect(result?.storageSizeGi).toBe(64);
  });

  it('should treat plain number as GiB', () => {
    const deployment = makeDeployment('my-pvc');
    deployment.model.spec.storage = { pvc: { name: 'my-pvc', size: '100' } };
    const result = extractNIMPVCFieldData(deployment);
    expect(result?.storageSizeGi).toBe(100);
  });

  it('should fall back to default for malformed size', () => {
    const deployment = makeDeployment('my-pvc');
    deployment.model.spec.storage = { pvc: { name: 'my-pvc', size: 'abc' } };
    const result = extractNIMPVCFieldData(deployment);
    expect(result?.storageSizeGi).toBe(50);
  });

  it('should default subPath to empty string when not set', () => {
    const result = extractNIMPVCFieldData(makeDeployment('my-pvc'));
    expect(result?.subPath).toBe('');
  });
});
