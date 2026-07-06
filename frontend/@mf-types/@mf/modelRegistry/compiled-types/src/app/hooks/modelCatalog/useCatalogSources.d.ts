import { FetchState } from 'mod-arch-core';
import { CatalogSourceList, CatalogSourceListParams } from '~/app/modelCatalogTypes';
import { ModelCatalogAPIState } from './useModelCatalogAPIState';
export declare const useCatalogSources: (apiState: ModelCatalogAPIState, listParams?: CatalogSourceListParams) => FetchState<CatalogSourceList>;
