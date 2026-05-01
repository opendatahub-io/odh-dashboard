import { FetchState } from 'mod-arch-core';
import { CatalogSourceList } from '~/app/modelCatalogTypes';
import { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
export declare const useCatalogSourcesWithPolling: (apiState: ModelCatalogAPIState) => FetchState<CatalogSourceList>;
