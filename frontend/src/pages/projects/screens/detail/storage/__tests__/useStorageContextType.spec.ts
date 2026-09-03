import type { LoadedExtension, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { ClusterStorageContextExtension } from '@odh-dashboard/plugin-core/extension-points';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { PvcModelAnnotation } from '#~/pages/projects/screens/spawner/storage/types';
import {
  GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
  MODEL_STORAGE_PVC_CONTEXT_TYPE,
  StorageContextType,
  getContextStorageTypeExplanation,
  getPVCContextStorageType,
  useStorageContextType,
} from '#~/pages/projects/screens/detail/storage/useStorageContextType';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
}));

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);

const makeExtension = (
  title: string,
  isPVCUsingStorageContextType: (pvc: PersistentVolumeClaimKind) => boolean = () => false,
): LoadedExtension<ResolvedExtension<ClusterStorageContextExtension>> => ({
  type: 'app.cluster-storage/storage-context',
  uid: `ext-${title}`,
  pluginName: 'test',
  properties: { title, description: `${title} desc`, isPVCUsingStorageContextType },
});

const modelPVC = mockPVCK8sResource({
  annotations: { [PvcModelAnnotation.MODEL_NAME]: 'my-model' },
});
const plainPVC = mockPVCK8sResource({});

describe('useStorageContextType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the two built-in types when there are no extensions', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    const renderResult = testHook(useStorageContextType)();

    expect(renderResult).hookToStrictEqual([
      [GENERAL_PURPOSE_PVC_CONTEXT_TYPE, MODEL_STORAGE_PVC_CONTEXT_TYPE],
      true,
    ]);
  });

  it('should propagate the loaded flag', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);

    const renderResult = testHook(useStorageContextType)();

    expect(renderResult.result.current[1]).toBe(false);
  });

  it('should append extension types sorted by title after the built-ins', () => {
    mockUseResolvedExtensions.mockReturnValue([
      [makeExtension('Zebra'), makeExtension('Alpha')],
      true,
      [],
    ]);

    const [types] = testHook(useStorageContextType)().result.current;

    expect(types.map((t) => t.title)).toEqual([
      GENERAL_PURPOSE_PVC_CONTEXT_TYPE.title,
      MODEL_STORAGE_PVC_CONTEXT_TYPE.title,
      'Alpha',
      'Zebra',
    ]);
  });
});

describe('getPVCContextStorageType', () => {
  const types: StorageContextType[] = [
    GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
    MODEL_STORAGE_PVC_CONTEXT_TYPE,
  ];

  it('should return the matching type for a model PVC', () => {
    expect(getPVCContextStorageType(modelPVC, types)).toBe(MODEL_STORAGE_PVC_CONTEXT_TYPE);
  });

  it('should fall back to general purpose when nothing matches', () => {
    expect(getPVCContextStorageType(plainPVC, types)).toBe(GENERAL_PURPOSE_PVC_CONTEXT_TYPE);
  });

  it('should fall back to general purpose when no types are provided', () => {
    expect(getPVCContextStorageType(modelPVC)).toBe(GENERAL_PURPOSE_PVC_CONTEXT_TYPE);
  });
});

describe('getContextStorageTypeExplanation', () => {
  it('should list a single type', () => {
    expect(getContextStorageTypeExplanation([GENERAL_PURPOSE_PVC_CONTEXT_TYPE])).toBe(
      'The context indicates the purpose of the storage: general purpose.',
    );
  });

  it('should join multiple types with a disjunction', () => {
    expect(
      getContextStorageTypeExplanation([
        GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
        MODEL_STORAGE_PVC_CONTEXT_TYPE,
      ]),
    ).toBe('The context indicates the purpose of the storage: general purpose or model storage.');
  });
});
