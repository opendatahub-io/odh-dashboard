import { CatalogModelCustomPropertyKey, ModelType } from '~/concepts/modelCatalog/const';
import { ModelRegistryCustomProperties } from '~/app/types';
export declare const MODEL_TYPE_CUSTOM_PROPERTY_KEY = CatalogModelCustomPropertyKey.MODEL_TYPE;
export type RegisterableModelType = ModelType.GENERATIVE | ModelType.PREDICTIVE | ModelType.UNKNOWN;
/** Raw `model_type` string for display (any non-empty STRING metadata), or null if unset. */
export declare const getModelTypeRawStringFromCustomProperties: (customProperties: ModelRegistryCustomProperties | undefined) => string | null;
export declare const getModelTypeStoredValueFromCustomProperties: (props: ModelRegistryCustomProperties | undefined) => RegisterableModelType | undefined;
export declare const buildCustomPropertiesWithModelType: (base: ModelRegistryCustomProperties | undefined, next: RegisterableModelType | undefined) => ModelRegistryCustomProperties;
