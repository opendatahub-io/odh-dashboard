import { FilterConfigMap, FilterState } from 'mod-arch-shared';
export declare enum ModelRegistryFilterOptions {
    keyword = "Keyword",
    owner = "Owner"
}
export type ModelRegistryFilterDataType = Record<ModelRegistryFilterOptions, string | undefined>;
export declare const registeredModelsFilterConfig: FilterConfigMap<ModelRegistryFilterOptions>;
export declare const registeredModelsVisibleFilterKeys: readonly [ModelRegistryFilterOptions.keyword, ModelRegistryFilterOptions.owner];
export declare const registeredModelsInitialFilterValues: FilterState<ModelRegistryFilterOptions>;
export declare enum ModelRegistryVersionsFilterOptions {
    keyword = "Keyword",
    author = "Author"
}
export type ModelRegistryVersionsFilterDataType = Record<ModelRegistryVersionsFilterOptions, string | undefined>;
export declare const modelVersionsFilterConfig: FilterConfigMap<ModelRegistryVersionsFilterOptions>;
export declare const modelVersionsVisibleFilterKeys: readonly [ModelRegistryVersionsFilterOptions.keyword, ModelRegistryVersionsFilterOptions.author];
export declare const modelVersionsInitialFilterValues: FilterState<ModelRegistryVersionsFilterOptions>;
export declare enum RegistrationMode {
    Register = "register",
    RegisterAndStore = "registerAndStore"
}
