import { FetchState } from 'mod-arch-core';
import { ServingRuntimeVersionList, ServingRuntimeVersionListParams } from '~/odh/types/servingRuntimeCatalogTypes';
export declare const useServingRuntimeVersions: (runtimeId: string, params?: ServingRuntimeVersionListParams) => FetchState<ServingRuntimeVersionList>;
