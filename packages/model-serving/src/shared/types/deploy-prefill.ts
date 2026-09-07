export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  catalogModelId?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: 'predictive' | 'generative';
  prefillAlertText?: string;
  validatedConfigurations?: {
    forField: string;
    title: string;
    description: string;
    options: { title: string; description: string; value: string }[];
  }[];
  selectedValidatedConfigurations?: Record<string, string[]>;
};

export type ModelDeployPrefillInfo = {
  modelName: string;
  modelFormat?: string;
  modelArtifactUri?: string;
  connectionTypeName?: string;
  initialConnectionName?: string;
  modelRegistryInfo?: {
    modelVersionId?: string;
    registeredModelId?: string;
    mrName?: string;
  };
  returnRoute?: string;
};

export type RegisteredModelRef = {
  id: string;
};

/** Props a page consumer passes to a deploy `core.action` via `componentProps`. */
export type DeployPrefillActionProps = {
  deployPrefill: DeployPrefillData;
  deployPrefillLoaded: boolean;
  deployPrefillError?: Error;
};
