import type { CatalogGridSpans } from '~/app/shared/components/catalog/types/catalogFilterTypes';

export const RUNTIME_CATALOG_FILTER_KEYS = ['hardware'] as const;

export type RuntimeCatalogFilterKey = (typeof RUNTIME_CATALOG_FILTER_KEYS)[number];

export type RuntimeCatalogFiltersState = Partial<Record<RuntimeCatalogFilterKey, string[]>>;

export const RUNTIME_CATALOG_FILTER_CATEGORY_NAMES: Record<RuntimeCatalogFilterKey, string> = {
  hardware: 'Hardware',
};

export const RUNTIME_CATALOG_HARDWARE_LABELS: Record<string, string> = {
  cpu: 'CPU',
  'cpu-or-gpu': 'CPU or GPU',
  'nvidia.com/gpu': 'NVIDIA GPU',
  'amd.com/gpu': 'AMD GPU',
  'ibm.com/spyre': 'IBM Spyre',
  'habana.ai/gaudi': 'Intel Gaudi',
};

export const RUNTIME_CATALOG_GALLERY_PAGE_SIZE = 50;

export const RUNTIME_CATALOG_GRID_SPANS: CatalogGridSpans = {
  sm: 12,
  md: 6,
  lg: 6,
  xl: 4,
  xl2: 3,
};
