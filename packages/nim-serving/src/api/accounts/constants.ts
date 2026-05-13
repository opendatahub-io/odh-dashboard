export const NIM_SECRET_NAME = 'nvidia-nim-secrets';
export const NIM_ACCOUNT_NAME = 'odh-nim-account';
// The Account operator validates the key using this field
export const NIM_API_KEY_DATA_KEY = 'api_key';
// NIM ServingRuntime/InferenceService deployments read the key from this field
export const NGC_API_KEY_DATA_KEY = 'NGC_API_KEY';
export const NIM_FORCE_VALIDATION_ANNOTATION = 'runtimes.opendatahub.io/nim-force-validation';
export const VALIDATION_TIMEOUT_MS = 300_000;
export const REVALIDATION_TIMEOUT_MS = 30_000;
