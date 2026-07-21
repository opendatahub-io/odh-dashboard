import { ModelRegistryCustomProperties, ModelRegistryCustomPropertyString } from '~/app/types';
import { CatalogModel, CatalogModelDetailsParams } from '~/app/modelCatalogTypes';
import { ModelSourceProperties, TransferJobParams } from './types';
/**
 * Converts model source properties to catalog parameters
 * @param properties - The model source properties
 * @returns CatalogModelDetailsParams object or null if not a catalog source or if required properties are missing
 */
export declare const modelSourcePropertiesToCatalogParams: (properties: ModelSourceProperties) => CatalogModelDetailsParams | null;
/**
 * Converts model source properties to transfer job parameters
 * @param properties - The model source properties
 * @returns TransferJobParams object or null if not a transfer job source or if required properties are missing
 */
export declare const modelSourcePropertiesToTransferJobParams: (properties: ModelSourceProperties) => TransferJobParams | null;
export declare const catalogParamsToModelSourceProperties: (params: CatalogModelDetailsParams) => ModelSourceProperties;
/**
 * Creates custom properties from a catalog model
 * @param model - The catalog model item
 * @returns ModelRegistryCustomProperties object with labels and tasks
 */
export declare const getLabelsFromModelTasks: (model: CatalogModel | null) => ModelRegistryCustomProperties;
export declare const getLabelsFromCustomProperties: (customProperties?: ModelRegistryCustomProperties) => Record<string, ModelRegistryCustomPropertyString>;
