import { FetchState } from 'mod-arch-core';
import { CatalogSourceList } from '~/app/shared/types/catalogTypes';
import { ModelCatalogAPIState } from '~/app/hooks/modelCatalog/useModelCatalogAPIState';
export declare const useMcpCatalogSourcesWithPolling: (apiState: ModelCatalogAPIState) => FetchState<CatalogSourceList>;
