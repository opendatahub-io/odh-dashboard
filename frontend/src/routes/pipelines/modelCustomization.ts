export const modelCustomizationRootPath = '/ai-hub/model-customization';
export const globModelCustomizationAll = `${modelCustomizationRootPath}/*`;
export const modelCustomizationFineTunePath = `${modelCustomizationRootPath}/fine-tune`;

export const getModelCustomizationPath = (namespace: string): string =>
  `${modelCustomizationFineTunePath}/${namespace}`;

export type ModelCustomizationRouterState = {
  modelRegistryName: string;
  modelRegistryDisplayName: string;
  registeredModelId: string;
  registeredModelName: string;
  modelVersionId: string;
  modelVersionName: string;
  inputModelLocationUri: string;
  outputModelRegistryApiUrl: string;
};
