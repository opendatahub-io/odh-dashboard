import { asEnumMember, DeploymentMode } from 'mod-arch-core';

// React Router paths are relative to the distribution's optional basename.
const URL_PREFIX = process.env.URL_PREFIX || '/gen-ai';
// Browser API requests retain the distribution base path.
const API_URL_PREFIX = `${process.env.BASE_PATH || ''}${URL_PREFIX}`;

const DEPLOYMENT_MODE =
  asEnumMember(process.env.DEPLOYMENT_MODE, DeploymentMode) || DeploymentMode.Federated;

export { URL_PREFIX, API_URL_PREFIX, DEPLOYMENT_MODE };
