import { FetchState } from 'mod-arch-core';
import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
export declare const useCatalogSourceConfigBySourceId: (sourceId: string) => FetchState<CatalogSourceConfig | null>;
