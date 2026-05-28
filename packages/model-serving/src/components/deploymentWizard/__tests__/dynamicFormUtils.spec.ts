import { renderHook } from '@testing-library/react';
import type { LoadedExtension, Extension } from '@openshift/dynamic-plugin-sdk';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { useWizardFieldOverrides } from '../dynamicFormUtils';
import type { ModelTypeFieldOverride, DeploymentWizardFieldOverride } from '../types';
import { isModelTypeFieldOverride } from '../types';

jest.mock('@odh-dashboard/plugin-core');

const makeOverrideExtension = (
  uid: string,
  field: DeploymentWizardFieldOverride,
): LoadedExtension<Extension> =>
  ({
    uid,
    type: 'model-serving.deployment/wizard-field-override',
    pluginID: '',
    pluginName: '',
    properties: { field },
  } as unknown as LoadedExtension<Extension>);

const makeModelTypeOverride = (
  uid: string,
  key: string,
  { forced, isActive = true }: { forced?: boolean; isActive?: boolean } = {},
): LoadedExtension<Extension> =>
  makeOverrideExtension(uid, {
    id: 'modelType',
    type: 'modifier',
    isActive: () => isActive,
    extraOption: { key, label: key },
    ...(forced !== undefined ? { forced } : {}),
  } as ModelTypeFieldOverride);

describe('useWizardFieldOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return empty array when no extensions are registered', () => {
    mockExtensions([]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toEqual([]);
  });

  it('should return active overrides filtered by predicate', () => {
    mockExtensions([makeModelTypeOverride('uid-a', 'Option A')]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].extraOption.key).toBe('Option A');
  });

  it('should exclude inactive overrides', () => {
    mockExtensions([makeModelTypeOverride('uid-a', 'Option A', { isActive: false })]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toEqual([]);
  });

  it('should sort overrides deterministically by uid', () => {
    mockExtensions([
      makeModelTypeOverride('uid-c', 'Option C'),
      makeModelTypeOverride('uid-a', 'Option A'),
      makeModelTypeOverride('uid-b', 'Option B'),
    ]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current.map((o) => o.extraOption.key)).toEqual([
      'Option A',
      'Option B',
      'Option C',
    ]);
  });

  it('should return only the forced override when one is present', () => {
    mockExtensions([
      makeModelTypeOverride('uid-a', 'Option A'),
      makeModelTypeOverride('uid-b', 'NVIDIA NIM', { forced: true }),
    ]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].extraOption.key).toBe('NVIDIA NIM');
    expect(result.current[0].forced).toBe(true);
  });

  it('should log error and return first forced override when multiple are forced', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockExtensions([
      makeModelTypeOverride('uid-b', 'Forced B', { forced: true }),
      makeModelTypeOverride('uid-a', 'Forced A', { forced: true }),
    ]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].extraOption.key).toBe('Forced A');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Multiple forced overrides detected'),
    );
  });

  it('should return all overrides when none are forced', () => {
    mockExtensions([
      makeModelTypeOverride('uid-a', 'Option A'),
      makeModelTypeOverride('uid-b', 'Option B'),
    ]);
    const { result } = renderHook(() => useWizardFieldOverrides(isModelTypeFieldOverride, {}));
    expect(result.current).toHaveLength(2);
  });
});
