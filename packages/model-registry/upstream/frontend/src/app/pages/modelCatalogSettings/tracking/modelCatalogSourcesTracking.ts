import { CatalogSourceConfig, CatalogSourceType } from '~/app/modelCatalogTypes';
import { TrackingOutcome } from '~/concepts/userInteraction';
import type { FormTrackingEventProperties } from '~/concepts/userInteraction/trackingTypes';

/** Event names for Model Catalog Source admin settings (Hugging Face credentials). */
export const MODEL_CATALOG_SOURCE_EVENTS = {
  MANAGE_SOURCE_SELECTED: 'Model Catalog Source Manage Source Selected',
  ACCESS_TOKEN_VALIDATED: 'Model Catalog Source Access Token Validated',
  ACCESS_TOKEN_CLEAR_CONFIRMED: 'Model Catalog Source Access Token Clear Confirmed',
  ENABLE_SOURCE_TOGGLED: 'Model Catalog Source Enable Source Toggled',
} as const;

export type ModelCatalogTrackingSourceType = 'huggingFace' | 'yaml';

export const MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE: ModelCatalogTrackingSourceType = 'huggingFace';

export type ModelCatalogAccessTokenClearOutcome = 'cleared' | 'cancelled';

export const getModelCatalogTrackingSourceType = (
  config: Pick<CatalogSourceConfig, 'type'>,
): ModelCatalogTrackingSourceType =>
  config.type === CatalogSourceType.HUGGING_FACE ? MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE : 'yaml';

export const buildAccessTokenValidatedTrackingProperties = (
  success: boolean,
  hasOrganization: boolean,
  error?: string,
): FormTrackingEventProperties => ({
  outcome: TrackingOutcome.submit,
  success,
  error,
  sourceType: MODEL_CATALOG_HF_TRACKING_SOURCE_TYPE,
  hasOrganization,
});
