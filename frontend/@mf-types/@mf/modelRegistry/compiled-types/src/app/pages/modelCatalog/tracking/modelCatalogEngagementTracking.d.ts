import { CatalogModel } from '~/app/modelCatalogTypes';
export type ModelCatalogTrackingHfAccessType = 'public' | 'private' | 'gated_auto' | 'gated_manual' | 'other';
export declare const getModelCatalogTrackingHfAccessType: (model: CatalogModel) => ModelCatalogTrackingHfAccessType;
export declare const getModelCatalogIsAccessGranted: (model: CatalogModel) => boolean;
