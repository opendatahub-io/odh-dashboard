export const RUNTIME_CATALOG_DETAILS_ACTION_GROUP = 'runtime-catalog.runtime-image/details-action';

export type RuntimeImageInstallActionData = {
  runtimeImageId: string;
  runtimeImageName: string;
  cancelReturnRoute: string;
  libraryReturnRoute: string;
  deploymentResources: {
    servingRuntimeTemplate?: string;
    /** Catalog field is `ServingRuntimeVersion.llmInferenceServiceTemplate`. */
    llmInferenceServiceConfig?: string;
  };
};

export type RuntimeImageInstallActionProps = {
  actionData: RuntimeImageInstallActionData;
};
