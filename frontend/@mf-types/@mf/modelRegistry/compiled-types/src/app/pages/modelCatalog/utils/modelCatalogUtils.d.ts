import { CatalogArtifacts, CatalogModel, CatalogModelDetailsParams, CatalogSourceList, ModelCatalogStringFilterValueType } from '~/app/modelCatalogTypes';
import { ModelCatalogStringFilterKey } from '~/concepts/modelCatalog/const';
export declare const extractVersionTag: (tags?: string[]) => string | undefined;
export declare const filterNonVersionTags: (tags?: string[]) => string[] | undefined;
export declare const getModelName: (modelName: string) => string;
export declare const decodeParams: (params: Readonly<CatalogModelDetailsParams>) => CatalogModelDetailsParams;
export declare const encodeParams: (params: CatalogModelDetailsParams) => CatalogModelDetailsParams;
export declare const filterEnabledCatalogSources: (catalogSources: CatalogSourceList | null) => CatalogSourceList | null;
export declare const getModelArtifactUri: (artifacts: CatalogArtifacts[]) => string;
export declare const hasModelArtifacts: (artifacts: CatalogArtifacts[]) => boolean;
export declare const isModelValidated: (model: CatalogModel) => boolean;
export declare const useCatalogStringFilterState: (filterKey: ModelCatalogStringFilterKey) => {
    isSelected: (value: ModelCatalogStringFilterValueType[ModelCatalogStringFilterKey]) => boolean;
    setSelected: (value: ModelCatalogStringFilterValueType[ModelCatalogStringFilterKey], selected: boolean) => void;
};
