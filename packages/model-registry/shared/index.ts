export type ValidatedConfigurationOption = {
  title: string;
  description: string;
  value: string;
};

export type ValidatedConfiguration = {
  forField: string;
  title: string;
  description: string;
  options: ValidatedConfigurationOption[];
};

export type DeployPrefillData = {
  modelName: string;
  modelUri?: string;
  returnRouteValue?: string;
  cancelReturnRouteValue?: string;
  wizardStartIndex?: number;
  modelType?: 'predictive' | 'generative';
  prefillAlertText?: string;
  validatedConfigurations?: ValidatedConfiguration[];
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
