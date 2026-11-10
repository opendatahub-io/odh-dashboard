import type { SimpleTrackingEventProperties } from '~/concepts/userInteraction/trackingTypes';
/** Event names for Model Catalog Source admin settings (Hugging Face credentials). */
export declare const MODEL_CATALOG_SOURCE_EVENTS: {
    readonly MANAGE_SOURCE_SELECTED: "Model Catalog Source Manage Source Selected";
    readonly ACCESS_TOKEN_VALIDATED: "Model Catalog Source Access Token Validated";
    readonly ACCESS_TOKEN_CLEAR_CONFIRMED: "Model Catalog Source Access Token Clear Confirmed";
    readonly ENABLE_SOURCE_TOGGLED: "Model Catalog Source Enable Source Toggled";
};
export type ModelCatalogTrackingSourceType = 'huggingFace' | 'yaml';
export declare const MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE: ModelCatalogTrackingSourceType;
export type ModelCatalogAccessTokenClearOutcome = 'cleared' | 'cancelled';
export declare const buildAccessTokenValidatedTrackingProperties: (success: boolean, hasOrganization: boolean, error?: string) => SimpleTrackingEventProperties;
