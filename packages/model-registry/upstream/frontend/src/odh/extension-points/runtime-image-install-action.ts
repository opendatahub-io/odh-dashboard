export const RUNTIME_CATALOG_DETAILS_ACTION_GROUP = 'runtime-catalog.runtime-image/details-action';

export type RuntimeImageInstallActionData = {
  runtimeImageId: string;
  runtimeImageName: string;
  cancelReturnRoute: string;
  libraryReturnRoute: string;
  /** Selected version string for tracking; undefined when no version is resolved. */
  version?: string;
  /** Hardware / accelerator label for tracking; undefined when not available. */
  hardware?: string;
  deploymentResources: {
    servingRuntimeTemplate?: string;
    /** Catalog field is `ServingRuntimeVersion.llmInferenceServiceConfig`. */
    llmInferenceServiceConfig?: string;
  };
};

export type RuntimeImageInstallActionProps = {
  actionData: RuntimeImageInstallActionData;
};
