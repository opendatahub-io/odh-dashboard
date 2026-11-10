import { FetchState } from 'mod-arch-core';
import { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
export declare const useServingRuntime: (runtimeId: string) => FetchState<ServingRuntime | null>;
