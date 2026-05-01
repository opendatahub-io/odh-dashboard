import { FetchState } from 'mod-arch-core';
import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
type State = CatalogSourceConfig | null;
export declare const useCatalogSourceConfigBySourceId: (sourceId: string) => FetchState<State>;
export {};
