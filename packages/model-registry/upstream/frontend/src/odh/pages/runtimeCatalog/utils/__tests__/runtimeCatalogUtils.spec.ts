import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import {
  getRuntimeCatalogDetailsRoute,
  getRuntimeHardwareDisplayLabel,
  getRuntimeHardwareFilterValues,
  getRuntimePrimaryHardwareLabel,
  hasRuntimeCatalogFiltersApplied,
  runtimeCatalogFiltersToFilterQuery,
} from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

describe('runtimeCatalogFiltersToFilterQuery', () => {
  it('should return empty string when no hardware filters are selected', () => {
    expect(runtimeCatalogFiltersToFilterQuery({})).toBe('');
  });

  it('should build hardware IN filter query', () => {
    expect(runtimeCatalogFiltersToFilterQuery({ hardware: ['cpu', 'nvidia.com/gpu'] })).toBe(
      "hardware IN ('cpu','nvidia.com/gpu')",
    );
  });
});

describe('hasRuntimeCatalogFiltersApplied', () => {
  it('should return true when search query is non-empty', () => {
    expect(hasRuntimeCatalogFiltersApplied({}, 'vllm')).toBe(true);
  });

  it('should return true when hardware filters are selected', () => {
    expect(hasRuntimeCatalogFiltersApplied({ hardware: ['cpu'] }, '')).toBe(true);
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
  it('should map known hardware values', () => {
    expect(getRuntimeHardwareDisplayLabel('ibm.com/spyre')).toBe('IBM Spyre');
  });
});

describe('getRuntimeCatalogDetailsRoute', () => {
  it('should build details route from runtime name', () => {
    expect(getRuntimeCatalogDetailsRoute('vllm')).toContain('/serving-runtime-catalog/vllm');
  });
});
