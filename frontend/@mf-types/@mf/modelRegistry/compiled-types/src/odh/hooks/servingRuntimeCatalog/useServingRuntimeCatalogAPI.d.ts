import { APIState } from 'mod-arch-core';
import { ServingRuntimeCatalogAPIs } from '~/odh/types/servingRuntimeCatalogTypes';
export type ServingRuntimeCatalogAPIState = APIState<ServingRuntimeCatalogAPIs>;
export declare const useServingRuntimeCatalogAPI: () => ServingRuntimeCatalogAPIState;
