export type DeployAgentEnvVarRequest = {
  name: string;
  value: string;
};

export type DeployAgentServicePortRequest = {
  name: string;
  port: number;
  targetPort: number;
  protocol?: string;
};

/** POST /api/v1/agents/deploy request body. */
export type DeployAgentRequest = {
  name: string;
  namespace: string;
  containerImage: string;
  imageTag: string;
  imagePullSecret?: string;
  protocol?: string;
  framework?: string;
  description?: string;
  envVars?: DeployAgentEnvVarRequest[];
  servicePorts?: DeployAgentServicePortRequest[];
  /** Gateway name for OpenShell provider routing. */
  gateway?: string;
  /** Provider name within the selected gateway. */
  provider?: string;
  /** LLM model identifier for the provider. */
  model?: string;
};

export type DeployAgentResponse = {
  success: boolean;
  name: string;
  namespace: string;
  message?: string;
};
