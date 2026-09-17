import * as React from 'react';

export const FORM_LABELS = {
  NAME: 'Name',
  SOURCE_TYPE: 'Source type',
  ORGANIZATION: 'Organization',
  ACCESS_TOKEN: 'Access token',
  YAML_CONTENT: 'Upload a YAML file',
  MODEL_VISIBILITY: 'Model visibility',
  ALLOWED_MODELS: 'Included models',
  EXCLUDED_MODELS: 'Excluded models',
  ENABLE_SOURCE: 'Enable source',
  CREDENTIALS: 'Credentials',
} as const;

export const BUTTON_LABELS = {
  ADD: 'Add',
  SAVE: 'Save',
  PREVIEW: 'Preview',
  CANCEL: 'Cancel',
} as const;

export const SOURCE_TYPE_LABELS = {
  HUGGING_FACE: 'Hugging Face repository',
  YAML: 'YAML file',
} as const;

export { SOURCE_NAME_CHARACTER_LIMIT } from '~/app/shared/catalogSettings/const';

export const VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Name is required',
  ORGANIZATION_REQUIRED: 'Organization is required',
  YAML_CONTENT_REQUIRED: 'YAML content is required',
} as const;

export const DESCRIPTION_TEXT = {
  ACCESS_TOKEN:
    'Enter your fine-grained Hugging Face access token. The token must have the following permissions: read repos in your namespace, read public repos that you can access, access webhooks, and create webhooks.',
  ORGANIZATION:
    'The name of an organization within the source to use models from. Hugging Face sources are limited to a single organization.',
  ENABLE_SOURCE:
    'Enable users in your organization to view models from this source in the model catalog.',
  FILTER_INFO_GENERIC:
    'Optionally filter which models from this source appear in the model catalog. If no filters are set, all models from the source will be visible.',
} as const;

export const HELPER_TEXT = {
  YAML: 'Upload or paste a YAML string.',
  ORGANIZATION_SLUG:
    'Case-sensitive. Type only the Hugging Face URL slug. For example, meta-llama.',
  ACCESS_TOKEN_HIDDEN: 'The access token is hidden. To replace or remove it, clear the token.',
} as const;

export const PLACEHOLDERS = {
  ORGANIZATION: 'Example: Google/',
  ALLOWED_MODELS: 'Example: Llama*, Llama-3.1-8B-Instruct',
  EXCLUDED_MODELS: 'Example: Llama*, Llama-3.1-8B-Instruct',
  EXISTING_TOKEN: '••••••••',
} as const;

export const CLEAR_ACCESS_TOKEN_MODAL = {
  MODAL_TITLE: 'Clear access token?',
  MODAL_BODY:
    'Gated and private models from this source will not be available in the model catalog.',
  CONFIRM_BTN: 'Clear access token',
  CANCEL_BTN: 'Cancel',
} as const;

export const EXPECTED_YAML_FORMAT_LABEL = 'View expected file format';

export const PAGE_TITLES = {
  MODEL_CATALOG_PREVIEW: 'Model catalog preview',
  PREVIEW_MODELS: 'Preview models',
} as const;

export const PREVIEW_ALERTS = {
  GATED_ACCESS_REQUIRED_TITLE: 'Additional action required',
  GATED_ACCESS_REQUIRED_BODY:
    'Some models in this source are gated. To enable them for the model catalog, request access to them on Hugging Face. It can take 24 hours for access updates to sync to OpenShift AI.',
  SOURCE_DISABLED_TITLE: 'Source not enabled',
  SOURCE_DISABLED_BODY:
    'Models from this source will not appear in the model catalog until the source is enabled.',
} as const;

export const ERROR_MESSAGES = {
  PREVIEW_FAILED: 'Preview failed',
  SAVE_FAILED: 'Failed to save source',
  FILE_UPLOAD_FAILED: 'File upload failed',
  FILE_UPLOAD_FAILED_BODY:
    "The YAML file couldn't be uploaded. Check its syntax and structure, then try again.",
  CLEAR_CREDENTIALS_FAILED: 'Failed to clear access token',
  VALIDATION_FAILED: 'Validation failed',
  VALIDATION_FAILED_BODY:
    'The access token is invalid. Ensure that it is accurate, then try again.',
  SOURCE_VALIDATION_FAILED: 'Validation failed',
  SOURCE_VALIDATION_FAILED_BODY: 'The source validation failed. Check the error details below.',
} as const;

export const SUCCESS_MESSAGES = {
  VALIDATION_SUCCESSFUL: 'Access token validated',
  VALIDATION_SUCCESSFUL_BODY: 'Access token validated successfully.',
} as const;

export const TOOLTIP_MESSAGES = {
  PREVIEW_REQUIRES_VALIDATION: 'To preview models, validate the access token.',
} as const;

export const TABLE_COLUMN_LABELS = {
  SOURCE_NAME: 'Source name',
  ORGANIZATION: 'Organization',
  MODEL_VISIBILITY: 'Model visibility',
  SOURCE_TYPE: 'Source type',
  ENABLE: 'Enable',
  VALIDATION_STATUS: 'Validation status',
} as const;

export const TABLE_COLUMN_POPOVERS = {
  ORGANIZATION:
    'Applies only to Hugging Face sources. Shows the organization the source syncs models from (for example, meta-llama). Only models within this organization are included in the catalog.',
  ENABLE:
    'Enable a source to make its models available to users in your organization from the model catalog.',
} as const;

export const EMPTY_STATE_TEXT = {
  NO_MODELS_INCLUDED: 'No models included',
  NO_MODELS_INCLUDED_BODY:
    'No models from this source are visible in the model catalog. To include models, edit the model visibility settings of this source.',
  NO_MODELS_EXCLUDED: 'No models excluded',
  NO_MODELS_EXCLUDED_BODY: 'No models from this source are excluded by this filter',
} as const;

export const getFilterInfoWithOrg = (organization: string): React.ReactNode => (
  <>
    Optionally filter which <strong>{organization}</strong> models from this source appear in the
    model catalog. If no filters are set, all <strong>{organization}</strong> models from the source
    will be visible.
  </>
);

export const getAllowedModelsHelp = (organization?: string): React.ReactNode =>
  organization ? (
    <>
      Enter names of <strong>{organization}</strong> models in this source that will appear in the
      catalog. If no names are specified, all <strong>{organization}</strong> models will be
      included.
    </>
  ) : (
    'Enter names of models in this source that will appear in the catalog. If no names are specified, all models will be included.'
  );

export const getExcludedModelsHelp = (organization?: string): React.ReactNode =>
  organization ? (
    <>
      Enter the names of <strong>{organization}</strong> models to exclude from this source. These
      models will not appear in the model catalog.
    </>
  ) : (
    'Enter the names of models to exclude from this source. These models will not appear in the model catalog.'
  );

/** Same for HF and YAML sources. */
export const getIncludedModelsFieldHelperText =
  'Separate model names using commas. To include all models with a specific prefix, enter the prefix followed by an asterisk. Example, Llama*';

/** Same for HF and YAML sources. */
export const getExcludedModelsFieldHelperText =
  'Separate model names using commas. To exclude all models with a specific prefix, enter the prefix followed by an asterisk. Example, Llama*';
