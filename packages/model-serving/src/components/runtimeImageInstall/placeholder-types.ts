import type { ServingRuntimeAPIProtocol, ServingRuntimeModelType } from '../../shared/types';

// TODO the types in this file are placeholders that will be replaced by types owned by the model-registry package
// which will live somewhere we can share across packages (likely @mf-types), which we will switch to consuming in https://redhat.atlassian.net/browse/RHOAIENG-96642

export type PlaceholderServingRuntimeTemplateData = {
  servingRuntimeYaml: string;
  apiProtocol: ServingRuntimeAPIProtocol;
  modelTypes: ServingRuntimeModelType[];
};

export type PlaceholderLlmAcceleratorConfigurationData = {
  configYaml: string;
  displayName: string;
  k8sName?: string;
  version?: string;
};

export type PlaceholderRuntimeImageActionProps = {
  actionData: PlaceholderRuntimeImageActionData;
};

export type PlaceholderRuntimeImageActionData = {
  runtimeImageId: string;
  runtimeImageName: string;
  cancelReturnRoute: string;
  deploymentResources: {
    servingRuntimeTemplate?: PlaceholderServingRuntimeTemplateData;
    llmAcceleratorConfiguration?: PlaceholderLlmAcceleratorConfigurationData;
  };
};
