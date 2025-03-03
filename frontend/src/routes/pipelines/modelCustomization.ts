import { BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY } from '~/pages/pipelines/global/modelCustomization/const';

export const modelCustomizationRootPath = '/modelCustomization';
export const globModelCustomizationAll = `${modelCustomizationRootPath}/*`;

export const getModelCustomizationPath = (
  namespace: string,
  modelRegistry: string,
  registeredModelId: string,
  modelVersionId: string,
  inputStorageLocationUri: string,
): string =>
  `${modelCustomizationRootPath}/fine-tune/${modelRegistry}/${registeredModelId}/${modelVersionId}/${namespace}?${BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY}=${inputStorageLocationUri}`;
