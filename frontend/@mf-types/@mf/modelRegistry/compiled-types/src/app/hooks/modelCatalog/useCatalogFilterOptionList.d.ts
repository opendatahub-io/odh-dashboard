import { FetchState } from 'mod-arch-core';
import { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';
import { ModelCatalogAPIState } from './useModelCatalogAPIState';
type State = CatalogFilterOptionsList | null;
export declare const useCatalogFilterOptionList: (apiState: ModelCatalogAPIState) => FetchState<State>;
export {};
