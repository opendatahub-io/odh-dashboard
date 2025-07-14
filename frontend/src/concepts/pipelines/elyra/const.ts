import { DEFAULT_PIPELINE_DEFINITION_NAME } from '#~/concepts/pipelines/const';

export const ELYRA_SECRET_NAME = 'ds-pipeline-config';
export const ELYRA_SECRET_DATA_KEY = 'odh_dsp.json';
export const ELYRA_SECRET_DATA_TYPE = 'cos_auth_type';
export const ELYRA_SECRET_DATA_ENDPOINT = 'public_api_endpoint';
export const ELYRA_ROLE_NAME = `ds-pipeline-user-access-${DEFAULT_PIPELINE_DEFINITION_NAME}`;
