import { stringFiltersToFilterQuery } from '~/app/shared/components/catalog';
import { RUNTIME_CATALOG_TAB_PATH } from '~/odh/routes/runtimeCatalog/runtimeCatalog';
import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import {
  RUNTIME_CATALOG_FILTER_KEYS,
  RUNTIME_CATALOG_HARDWARE_LABELS,
  type RuntimeCatalogFiltersState,
} from '~/odh/pages/runtimeCatalog/const';

export function runtimeCatalogFiltersToFilterQuery(filters: RuntimeCatalogFiltersState): string {
  return stringFiltersToFilterQuery(filters, {});
}

export function hasRuntimeCatalogFiltersApplied(
  filters: RuntimeCatalogFiltersState,
  searchQuery: string,
): boolean {
  if (searchQuery.trim().length > 0) {
    return true;
  }
  return RUNTIME_CATALOG_FILTER_KEYS.some((key) => (filters[key]?.length ?? 0) > 0);
}

export function getRuntimeHardwareFilterValues(runtime: ServingRuntime): string[] {
  const values: string[] = [];
  runtime.tags?.forEach((tag) => {
    if (tag === 'cpu' || tag === 'cpu-or-gpu') {
      values.push(tag);
    }
  });
  runtime.capabilities?.supportedAccelerators?.forEach((accelerator) => {
    values.push(accelerator);
  });
  return values;
}

export function getRuntimeHardwareDisplayLabel(value: string): string {
  return RUNTIME_CATALOG_HARDWARE_LABELS[value] ?? value;
}

/** Primary hardware label shown on catalog cards (prefers accelerators over CPU tags). */
export function getRuntimePrimaryHardwareLabel(runtime: ServingRuntime): string | undefined {
  const accelerators = runtime.capabilities?.supportedAccelerators ?? [];
  if (accelerators.length > 0) {
    return getRuntimeHardwareDisplayLabel(accelerators[0]);
  }
  const cpuTag = runtime.tags?.find((tag) => tag === 'cpu' || tag === 'cpu-or-gpu');
  return cpuTag ? getRuntimeHardwareDisplayLabel(cpuTag) : undefined;
}

export function getRuntimeCatalogDetailsRoute(runtimeName: string): string {
  return `${RUNTIME_CATALOG_TAB_PATH}/${encodeURIComponent(runtimeName)}`;
}

export function getRuntimeCatalogCardKey(runtime: ServingRuntime): string {
  return runtime.name ?? runtime.externalId ?? runtime.id ?? '';
}
