import type { CatalogGridSpans } from '~/app/shared/components/catalog/types/catalogFilterTypes';

/** Catalog field that lists the accelerators a runtime supports; the filter key and filterQuery field. */
export const RUNTIME_CATALOG_HARDWARE_FILTER_KEY = 'capabilities.supportedAccelerators';

export const RUNTIME_CATALOG_FILTER_KEYS = [RUNTIME_CATALOG_HARDWARE_FILTER_KEY] as const;

export type RuntimeCatalogFilterKey = (typeof RUNTIME_CATALOG_FILTER_KEYS)[number];

export type RuntimeCatalogFiltersState = Partial<Record<RuntimeCatalogFilterKey, string[]>>;

export const RUNTIME_CATALOG_FILTER_CATEGORY_NAMES: Record<RuntimeCatalogFilterKey, string> = {
  [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: 'Hardware',
};

export const RUNTIME_CATALOG_HARDWARE_LABELS: Record<string, string> = {
  cpu: 'CPU',
  'cpu-or-gpu': 'CPU or GPU',
  'nvidia.com/gpu': 'NVIDIA GPU',
  'amd.com/gpu': 'AMD GPU',
  'ibm.com/spyre_pf': 'IBM Spyre (PF)',
  'ibm.com/spyre_vf': 'IBM Spyre (VF)',
  'habana.ai/gaudi': 'Intel Gaudi',
};

/** Value → display label per filter key, shared by the filter panel and the active-filter chips. */
export const RUNTIME_CATALOG_FILTER_LABELS: Record<
  RuntimeCatalogFilterKey,
  Record<string, string>
> = {
  [RUNTIME_CATALOG_HARDWARE_FILTER_KEY]: RUNTIME_CATALOG_HARDWARE_LABELS,
};

export const RUNTIME_CATALOG_GALLERY_PAGE_SIZE = 10;

export const RUNTIME_CATALOG_GRID_SPANS: CatalogGridSpans = {
  sm: 12,
  md: 6,
  lg: 6,
  xl: 4,
  xl2: 3,
};
