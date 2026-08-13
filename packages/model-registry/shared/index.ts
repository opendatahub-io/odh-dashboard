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

/** Props passed from model catalog details into the model-serving deploy `core.action`. */
export type CatalogDeployActionComponentProps = {
  deployPrefill: DeployPrefillData;
  deployPrefillLoaded: boolean;
  deployPrefillError?: Error;
};
