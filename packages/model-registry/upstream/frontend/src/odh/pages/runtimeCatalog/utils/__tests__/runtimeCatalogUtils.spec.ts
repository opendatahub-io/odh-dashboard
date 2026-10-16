import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import { RUNTIME_CATALOG_HARDWARE_FILTER_KEY } from '~/odh/pages/runtimeCatalog/const';
import {
  getRuntimeCatalogDetailsRoute,
  getRuntimeHardwareDisplayLabel,
  getRuntimeHardwareFilterValues,
  getRuntimePrimaryHardwareLabel,
  hasRuntimeCatalogFiltersApplied,
  runtimeCatalogFiltersToFilterQuery,
} from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

describe('runtimeCatalogFiltersToFilterQuery', () => {
  it('should return empty string when no accelerator filters are selected', () => {
    expect(runtimeCatalogFiltersToFilterQuery({})).toBe('');
  });

  it('should build an accelerator equality filter query for one value', () => {
    expect(
      runtimeCatalogFiltersToFilterQuery({
        [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: ['nvidia.com/gpu'],
      }),
    ).toBe("capabilities.supportedAccelerators='nvidia.com/gpu'");
  });

  it('should build an accelerator IN filter query for several values', () => {
    expect(
      runtimeCatalogFiltersToFilterQuery({
        [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: ['amd.com/gpu', 'habana.ai/gaudi'],
      }),
    ).toBe("capabilities.supportedAccelerators IN ('amd.com/gpu','habana.ai/gaudi')");
  });
});

describe('hasRuntimeCatalogFiltersApplied', () => {
  it('should return true when search query is non-empty', () => {
    expect(hasRuntimeCatalogFiltersApplied({}, 'vllm')).toBe(true);
  });

  it('should return true when hardware filters are selected', () => {
    expect(
      hasRuntimeCatalogFiltersApplied(
        { [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: ['nvidia.com/gpu'] },
        '',
      ),
    ).toBe(true);
  });

  it('should return false when no filters or search are applied', () => {
    expect(
      hasRuntimeCatalogFiltersApplied({ [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: [] }, ' '),
    ).toBe(false);
  });
});

describe('getRuntimeHardwareFilterValues', () => {
  it('should collect cpu tags and supported accelerators', () => {
    const runtime: ServingRuntime = {
      name: 'triton',
      tags: ['gpu', 'cpu-or-gpu'],
      capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
    };
    expect(getRuntimeHardwareFilterValues(runtime)).toEqual(['cpu-or-gpu', 'nvidia.com/gpu']);
  });
});

describe('getRuntimePrimaryHardwareLabel', () => {
  it('should prefer accelerator labels over cpu tags', () => {
    const runtime: ServingRuntime = {
      name: 'vllm',
      tags: ['cpu'],
      capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
    };
    expect(getRuntimePrimaryHardwareLabel(runtime)).toBe('NVIDIA GPU');
  });

  it('should map cpu tag to display label', () => {
    const runtime: ServingRuntime = {
      name: 'ovms',
      tags: ['cpu'],
    };
    expect(getRuntimePrimaryHardwareLabel(runtime)).toBe('CPU');
  });
});

describe('getRuntimeHardwareDisplayLabel', () => {
  it.each([
    ['amd.com/gpu', 'AMD GPU'],
    ['habana.ai/gaudi', 'Intel Gaudi'],
    ['ibm.com/spyre_pf', 'IBM Spyre (PF)'],
    ['ibm.com/spyre_vf', 'IBM Spyre (VF)'],
    ['nvidia.com/gpu', 'NVIDIA GPU'],
  ])('should map catalog accelerator %s to %s', (value, label) => {
    expect(getRuntimeHardwareDisplayLabel(value)).toBe(label);
  });

  it('should fall back to the raw value for unknown accelerators', () => {
    expect(getRuntimeHardwareDisplayLabel('example.com/tpu')).toBe('example.com/tpu');
  });
});

describe('getRuntimeCatalogDetailsRoute', () => {
  it('should build details route from the runtime ID', () => {
    expect(getRuntimeCatalogDetailsRoute('1')).toContain('/serving-runtime-catalog/1');
  });
});
