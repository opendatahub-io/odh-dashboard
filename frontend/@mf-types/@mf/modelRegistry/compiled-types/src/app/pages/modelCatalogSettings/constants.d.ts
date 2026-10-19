import * as React from 'react';
export declare const FORM_LABELS: {
    readonly NAME: "Name";
    readonly SOURCE_TYPE: "Source type";
    readonly ORGANIZATION: "Organization";
    readonly ACCESS_TOKEN: "Access token";
    readonly YAML_CONTENT: "Upload a YAML file";
    readonly MODEL_VISIBILITY: "Model visibility";
    readonly ALLOWED_MODELS: "Included models";
    readonly EXCLUDED_MODELS: "Excluded models";
    readonly ENABLE_SOURCE: "Enable source";
    readonly CREDENTIALS: "Credentials";
};
export declare const BUTTON_LABELS: {
    readonly ADD: "Add";
    readonly SAVE: "Save";
    readonly PREVIEW: "Preview";
    readonly CANCEL: "Cancel";
};
export declare const SOURCE_TYPE_LABELS: {
    readonly HUGGING_FACE: "Hugging Face repository";
    readonly YAML: "YAML file";
};
export { SOURCE_NAME_CHARACTER_LIMIT } from '~/app/shared/catalogSettings/const';
export declare const VALIDATION_MESSAGES: {
    readonly NAME_REQUIRED: "Name is required";
    readonly ORGANIZATION_REQUIRED: "Organization is required";
    readonly YAML_CONTENT_REQUIRED: "YAML content is required";
};
export declare const DESCRIPTION_TEXT: {
    readonly ACCESS_TOKEN: "Enter your fine-grained Hugging Face access token. The token must have the following permissions: read repos in your namespace, read public repos that you can access, access webhooks, and create webhooks.";
    readonly ORGANIZATION: "The name of an organization within the source to use models from. Hugging Face sources are limited to a single organization.";
    readonly ENABLE_SOURCE: "Enable users in your organization to view models from this source in the model catalog.";
    readonly FILTER_INFO_GENERIC: "Optionally filter which models from this source appear in the model catalog. If no filters are set, all models from the source will be visible.";
};
export declare const HELPER_TEXT: {
    readonly YAML: "Upload or paste a YAML string.";
    readonly ORGANIZATION_SLUG: "Case-sensitive. Type only the Hugging Face URL slug. For example, meta-llama.";
    readonly ACCESS_TOKEN_HIDDEN: "The access token is hidden. To replace or remove it, clear the token.";
};
export declare const PLACEHOLDERS: {
    readonly ORGANIZATION: "Example: Google/";
    readonly ALLOWED_MODELS: "Example: Llama*, Llama-3.1-8B-Instruct";
    readonly EXCLUDED_MODELS: "Example: Llama*, Llama-3.1-8B-Instruct";
    readonly EXISTING_TOKEN: "••••••••";
};
export declare const CLEAR_ACCESS_TOKEN_MODAL: {
    readonly MODAL_TITLE: "Clear access token?";
    readonly MODAL_BODY: "Gated and private models from this source will not be available in the model catalog.";
    readonly CONFIRM_BTN: "Clear access token";
    readonly CANCEL_BTN: "Cancel";
};
export declare const EXPECTED_YAML_FORMAT_LABEL = "View expected file format";
export declare const PAGE_TITLES: {
    readonly MODEL_CATALOG_PREVIEW: "Model catalog preview";
    readonly PREVIEW_MODELS: "Preview models";
};
export declare const PREVIEW_ALERTS: {
    readonly GATED_ACCESS_REQUIRED_TITLE: "Additional action required";
    readonly GATED_ACCESS_REQUIRED_BODY: "Some models in this source are gated. To enable them for the model catalog, request access to them on Hugging Face. It can take 24 hours for access updates to sync to OpenShift AI.";
    readonly SOURCE_DISABLED_TITLE: "Source not enabled";
    readonly SOURCE_DISABLED_BODY: "Models from this source will not appear in the model catalog until the source is enabled.";
};
export declare const ERROR_MESSAGES: {
    readonly PREVIEW_FAILED: "Preview failed";
    readonly SAVE_FAILED: "Failed to save source";
    readonly FILE_UPLOAD_FAILED: "File upload failed";
    readonly FILE_UPLOAD_FAILED_BODY: "The YAML file couldn't be uploaded. Check its syntax and structure, then try again.";
    readonly CLEAR_CREDENTIALS_FAILED: "Failed to clear access token";
    readonly VALIDATION_FAILED: "Validation failed";
    readonly VALIDATION_FAILED_BODY: "The access token is invalid. Ensure that it is accurate, then try again.";
    readonly SOURCE_VALIDATION_FAILED: "Validation failed";
    readonly SOURCE_VALIDATION_FAILED_BODY: "The source validation failed. Check the error details below.";
};
export declare const SUCCESS_MESSAGES: {
    readonly VALIDATION_SUCCESSFUL: "Access token validated";
    readonly VALIDATION_SUCCESSFUL_BODY: "Access token validated successfully.";
};
export declare const TOOLTIP_MESSAGES: {
    readonly PREVIEW_REQUIRES_VALIDATION: "To preview models, validate the access token.";
};
export declare const TABLE_COLUMN_LABELS: {
    readonly SOURCE_NAME: "Source name";
    readonly ORGANIZATION: "Organization";
    readonly MODEL_VISIBILITY: "Model visibility";
    readonly SOURCE_TYPE: "Source type";
    readonly ENABLE: "Enable";
    readonly VALIDATION_STATUS: "Validation status";
};
export declare const TABLE_COLUMN_POPOVERS: {
    readonly ORGANIZATION: "Applies only to Hugging Face sources. Shows the organization the source syncs models from (for example, meta-llama). Only models within this organization are included in the catalog.";
    readonly ENABLE: "Enable a source to make its models available to users in your organization from the model catalog.";
};
export declare const EMPTY_STATE_TEXT: {
    readonly NO_MODELS_INCLUDED: "No models included";
    readonly NO_MODELS_INCLUDED_BODY: "No models from this source are visible in the model catalog. To include models, edit the model visibility settings of this source.";
    readonly NO_MODELS_EXCLUDED: "No models excluded";
    readonly NO_MODELS_EXCLUDED_BODY: "No models from this source are excluded by this filter";
};
export declare const getFilterInfoWithOrg: (organization: string) => React.ReactNode;
export declare const getAllowedModelsHelp: (organization?: string) => React.ReactNode;
export declare const getExcludedModelsHelp: (organization?: string) => React.ReactNode;
/** Same for HF and YAML sources. */
export declare const getIncludedModelsFieldHelperText = "Separate model names using commas. To include all models with a specific prefix, enter the prefix followed by an asterisk. Example, Llama*";
/** Same for HF and YAML sources. */
export declare const getExcludedModelsFieldHelperText = "Separate model names using commas. To exclude all models with a specific prefix, enter the prefix followed by an asterisk. Example, Llama*";
