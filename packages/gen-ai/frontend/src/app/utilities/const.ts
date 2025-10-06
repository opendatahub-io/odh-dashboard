import { asEnumMember, DeploymentMode } from 'mod-arch-core';

const URL_PREFIX = process.env.URL_PREFIX || '/gen-ai';

const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;

const MCP_SERVERS_SESSION_STORAGE_KEY = 'gen-ai-playground-servers';

export { URL_PREFIX, DEPLOYMENT_MODE, MCP_SERVERS_SESSION_STORAGE_KEY };
