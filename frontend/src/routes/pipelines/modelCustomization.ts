export const modelCustomizationRootPath = '/modelCustomization';
export const globModelCustomizationAll = `${modelCustomizationRootPath}/*`;

export const getModelCustomizationPath = (namespace: string): string =>
  `${modelCustomizationRootPath}/fine-tune/${namespace}`;

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
