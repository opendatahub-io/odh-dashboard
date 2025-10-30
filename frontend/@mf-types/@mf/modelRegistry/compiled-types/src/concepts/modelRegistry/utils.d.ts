import { ModelRegistryCustomProperties, ModelRegistryCustomPropertyString } from '~/app/types';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { ModelSourceProperties } from './types';
/**
 * Converts model source properties to catalog parameters
 * @param properties - The model source properties
 * @returns CatalogModelDetailsParams object or null if not a catalog source or if required properties are missing
 */
export declare const modelSourcePropertiesToCatalogParams: (properties: ModelSourceProperties) => CatalogModelDetailsParams | null;
export declare const catalogParamsToModelSourceProperties: (params: CatalogModelDetailsParams) => ModelSourceProperties;
/**
 * Creates custom properties from a catalog model
 * @param model - The catalog model item
 * @returns ModelRegistryCustomProperties object with labels and tasks
 */
export declare const getLabelsFromModelTasks: (model: CatalogModel | null) => ModelRegistryCustomProperties;
export declare const getLabelsFromCustomProperties: (customProperties?: ModelRegistryCustomProperties) => Record<string, ModelRegistryCustomPropertyString>;
