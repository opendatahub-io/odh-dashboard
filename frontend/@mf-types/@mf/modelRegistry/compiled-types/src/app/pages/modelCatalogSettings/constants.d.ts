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
export declare const SOURCE_NAME_CHARACTER_LIMIT = 238;
export declare const VALIDATION_MESSAGES: {
    readonly NAME_REQUIRED: "Name is required";
    readonly ORGANIZATION_REQUIRED: "Organization is required";
    readonly YAML_CONTENT_REQUIRED: "YAML content is required";
};
export declare const DESCRIPTION_TEXT: {
    readonly ACCESS_TOKEN: "Enter your fine-grained Hugging Face access token. The token must have the following permissions: read repos in your namespace, read public repos that you can access, access webhooks, and create webhooks.";
    readonly ORGANIZATION: "Enter the name of the organization (for example, meta-llama) to sync models from. Hugging Face sources are limited to 1 organization to prevent performance issues related to loading large model sets.";
    readonly ENABLE_SOURCE: "Enable users in your organization to view models from this source in the model catalog.";
    readonly FILTER_INFO_GENERIC: "Optionally filter which models from this source appear in the model catalog. If no filters are set, all models from the source will be visible.";
};
export declare const HELPER_TEXT: {
    readonly ACCESS_TOKEN: "Enter your Hugging Face access token.";
    readonly YAML: "Upload or paste a YAML string.";
    readonly ORGANIZATION_SLUG: "Hugging Face organization’s name is case-sensitive and should match the organization’s URL, which may differ from the displayed name. Use the organization’s URL slug found in the URL (e.g., Input: meta-llama from huggingface.co/meta-llama).";
};
export declare const PLACEHOLDERS: {
    readonly ORGANIZATION: "Example: meta-llama";
    readonly ALLOWED_MODELS: "Example: Llama*, Llama-3.1-8B-Instruct";
    readonly EXCLUDED_MODELS: "Example: Llama*, Llama-3.1-8B-Instruct";
};
export declare const EXPECTED_YAML_FORMAT_LABEL = "View expected file format";
export declare const PAGE_TITLES: {
    readonly MODEL_CATALOG_PREVIEW: "Model catalog preview";
    readonly PREVIEW_MODELS: "Preview models";
};
export declare const ERROR_MESSAGES: {
    readonly PREVIEW_FAILED: "Preview failed";
    readonly SAVE_FAILED: "Failed to save source";
    readonly FILE_UPLOAD_FAILED: "File upload failed";
    readonly FILE_UPLOAD_FAILED_BODY: "The YAML file couldn't be uploaded. Check its syntax and structure, then try again.";
    readonly VALIDATION_FAILED: "Validation failed";
    readonly VALIDATION_FAILED_BODY: "The system cannot establish a connection to the source.";
};
export declare const SUCCESS_MESSAGES: {
    readonly VALIDATION_SUCCESSFUL: "Validation successful";
    readonly VALIDATION_SUCCESSFUL_BODY: "The organization and access token are valid for connection.";
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
