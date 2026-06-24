export enum ModelDeploymentState {
  PENDING = 'Pending',
  STANDBY = 'Standby',
  FAILED_TO_LOAD = 'FailedToLoad',
  LOADING = 'Loading',
  LOADED = 'Loaded',
  UNKNOWN = 'Unknown',
}

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
};
