import { CatalogModelDetailsParams, CatalogSourceList } from '~/app/modelCatalogTypes';
export declare const extractVersionTag: (tags?: string[]) => string | undefined;
export declare const filterNonVersionTags: (tags?: string[]) => string[] | undefined;
export declare const getModelName: (modelName: string) => string;
export declare const decodeParams: (params: Readonly<CatalogModelDetailsParams>) => CatalogModelDetailsParams;
export declare const encodeParams: (params: CatalogModelDetailsParams) => CatalogModelDetailsParams;
export declare const filterEnabledCatalogSources: (catalogSources: CatalogSourceList | null) => CatalogSourceList | null;
