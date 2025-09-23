import { asEnumMember, DeploymentMode } from 'mod-arch-core';

const URL_PREFIX = process.env.URL_PREFIX || '/gen-ai';
const PLAYGROUND_URL_PREFIX = `${URL_PREFIX}/playground`;
const ASSETS_URL_PREFIX = `${URL_PREFIX}/assets`;

const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;

const MCP_SERVERS_SESSION_STORAGE_KEY = 'gen-ai-playground-servers';

export {
  URL_PREFIX,
  DEPLOYMENT_MODE,
  PLAYGROUND_URL_PREFIX,
  ASSETS_URL_PREFIX,
  MCP_SERVERS_SESSION_STORAGE_KEY,
};
