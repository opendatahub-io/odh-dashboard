import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
import { type RuntimeCatalogFiltersState } from '~/odh/pages/runtimeCatalog/const';
export declare function runtimeCatalogFiltersToFilterQuery(filters: RuntimeCatalogFiltersState): string;
export declare function hasRuntimeCatalogFiltersApplied(filters: RuntimeCatalogFiltersState, searchQuery: string): boolean;
export declare function getRuntimeHardwareFilterValues(runtime: ServingRuntime): string[];
export declare function getRuntimeHardwareDisplayLabel(value: string): string;
/** Primary hardware label shown on catalog cards (prefers accelerators over CPU tags). */
export declare function getRuntimePrimaryHardwareLabel(runtime: ServingRuntime): string | undefined;
export declare function getRuntimeCatalogDetailsRoute(runtimeId: string): string;
export declare function getRuntimeCatalogCardKey(runtime: ServingRuntime): string;
