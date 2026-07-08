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

/** POST /api/v1/agents/deploy request body (no kagenti auth fields). */
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
};

export type DeployAgentResponse = {
  success: boolean;
  name: string;
  namespace: string;
  message?: string;
};
