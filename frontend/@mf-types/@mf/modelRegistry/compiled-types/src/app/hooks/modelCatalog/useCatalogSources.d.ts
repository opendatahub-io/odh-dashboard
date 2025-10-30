import { FetchState } from 'mod-arch-core';
import { CatalogSourceList } from '~/app/modelCatalogTypes';
import { ModelCatalogAPIState } from './useModelCatalogAPIState';
export declare const useCatalogSources: (apiState: ModelCatalogAPIState) => FetchState<CatalogSourceList>;
