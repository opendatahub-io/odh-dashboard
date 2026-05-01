import { FetchState } from 'mod-arch-core';
import { CatalogLabelList, CatalogLabelListParams } from '~/app/modelCatalogTypes';
import { ModelCatalogAPIState } from './useModelCatalogAPIState';
export declare const useCatalogLabels: (apiState: ModelCatalogAPIState, listParams?: CatalogLabelListParams) => FetchState<CatalogLabelList>;
