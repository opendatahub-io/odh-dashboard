import { FetchState } from 'mod-arch-core';
import { CatalogModel } from '~/app/modelCatalogTypes';
type State = CatalogModel | null;
export declare const useCatalogModel: (sourceId: string, modelName: string) => FetchState<State>;
export {};
