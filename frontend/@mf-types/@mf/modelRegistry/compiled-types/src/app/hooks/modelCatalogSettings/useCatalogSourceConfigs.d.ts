import { FetchState } from 'mod-arch-core';
import { CatalogSourceConfigList } from '~/app/modelCatalogTypes';
import { ModelCatalogSettingsAPIState } from './useModelCatalogSettingsAPIState';
export declare const useCatalogSourceConfigs: (apiState: ModelCatalogSettingsAPIState) => FetchState<CatalogSourceConfigList>;
