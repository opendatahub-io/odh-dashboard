export declare enum ModelRegistryFilterOptions {
    keyword = "Keyword",
    owner = "Owner"
}
export declare const modelRegistryFilterOptions: {
    Keyword: string;
    Owner: string;
};
export type ModelRegistryFilterDataType = Record<ModelRegistryFilterOptions, string | undefined>;
export declare const initialModelRegistryFilterData: ModelRegistryFilterDataType;
export declare enum ModelRegistryVersionsFilterOptions {
    keyword = "Keyword",
    author = "Author"
}
export declare const modelRegistryVersionsFilterOptions: {
    Keyword: string;
    Author: string;
};
export type ModelRegistryVersionsFilterDataType = Record<ModelRegistryVersionsFilterOptions, string | undefined>;
export declare const initialModelRegistryVersionsFilterData: ModelRegistryVersionsFilterDataType;
