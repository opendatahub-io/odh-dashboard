import { DeploymentMode, asEnumMember } from 'mod-arch-core';

const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;
const URL_PREFIX = '/_bff/mlflow';
const BFF_API_VERSION = 'v1';
const WORKSPACE_PARAM = 'workspace';

export { URL_PREFIX, DEPLOYMENT_MODE, BFF_API_VERSION, WORKSPACE_PARAM };
