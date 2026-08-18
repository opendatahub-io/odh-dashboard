import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

export { TrackingOutcome };

export const AUTORAG_EVENTS = {
  PROJECT_DROPDOWN_OPTION_SELECTED: 'AutoRAG Project Dropdown Option Selected',
  EXPERIMENT_CREATED: 'AutoRAG Experiment Created',
  KNOWLEDGE_SOURCE_CONFIGURED: 'AutoRAG Knowledge Source Configured',
  EVALUATION_SOURCE_CONFIGURED: 'AutoRAG Evaluation Source Configured',
  MODELS_SELECTED: 'AutoRAG Models Selected',
  VECTOR_STORE_CONFIGURED: 'AutoRAG Vector Store Configured',
} as const;

export const fireAutoragProjectDropdownOptionSelected = (selectedProject: string): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PROJECT_DROPDOWN_OPTION_SELECTED, { selectedProject });
};

/**
 * Allowlisted, non-sensitive failure category for outcome-tracking `error` fields.
 * `Error.message` from upload, selection, and configuration failures may originate from the
 * backend, a proxy, or a dependency, and can embed credentials, tenant identifiers, resource
 * details, user input, or internal endpoint information. Never forward a raw error message into
 * analytics — detailed messages belong only in the in-product notification shown via
 * `useNotification`. Callers must map caught errors to this fixed set before passing them to an
 * outcome-tracking event.
 */
export type AutoragFailureCategory = 'actionFailed';

/** The single allowlisted failure category currently in use — see {@link AutoragFailureCategory}. */
export const AUTORAG_FAILURE_CATEGORY: AutoragFailureCategory = 'actionFailed';

export type ExperimentCreatedProperties = {
  outcome: TrackingOutcome;
  hasDescription: boolean;
  success?: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires when the user leaves the "Define Details" (name/description/connection) step of the
 * create-experiment flow — either moving forward (outcome: submit) or cancelling out
 * (outcome: cancel). This is a pure local step transition with no backend call, so `success` is
 * always `true` and `error` is omitted when submitting (the Next button is disabled until the
 * step's fields are valid). Full run configuration metadata (optimization metric, source types,
 * models, vector DB) is captured later, on AutoRAG Run Triggered, once the Knowledge/Eval/Models
 * sections of the configure step are also complete.
 */
export const fireAutoragExperimentCreated = (properties: ExperimentCreatedProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.EXPERIMENT_CREATED, properties);
};

export type KnowledgeSourceType = 's3' | 'upload';

export type KnowledgeSourceConfiguredProperties = {
  knowledgeSourceType: KnowledgeSourceType;
  countOfDocuments: number;
  outcome: TrackingOutcome;
  success: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires when the user completes (or abandons) the "Knowledge setup" milestone on the configure
 * step — selecting a file/folder from an S3 connection via the file browser, or uploading a file
 * directly. `outcome: submit` covers both a successful selection/upload and a failed upload
 * attempt (see `success`/`error`); `outcome: cancel` fires when the S3 browser is dismissed
 * without a selection being made.
 */
export const fireAutoragKnowledgeSourceConfigured = (
  properties: KnowledgeSourceConfiguredProperties,
): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED, properties);
};

export type EvaluationSourceType = 's3' | 'upload';

export type EvaluationSourceConfiguredProperties = {
  evaluationSourceType: EvaluationSourceType;
  countOfDocuments: number;
  outcome: TrackingOutcome;
  success: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires when the user completes (or abandons) the "Evaluation source" milestone on the configure
 * step — selecting a JSON file from an S3 connection via the file browser, or uploading one
 * directly. `outcome: submit` covers both a successful selection/upload and a failed upload
 * attempt (see `success`/`error`); `outcome: cancel` fires when the S3 browser is dismissed
 * without a selection being made.
 */
export const fireAutoragEvaluationSourceConfigured = (
  properties: EvaluationSourceConfiguredProperties,
): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED, properties);
};

export type ModelsSelectedProperties = {
  countOfFoundationModels: number;
  countOfEmbeddingModels: number;
  outcome: TrackingOutcome;
  success: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires when the user completes (or abandons) the "Model configuration" milestone — the
 * foundation/embedding model selection modal reached from "Models to test" in the configure
 * step. `outcome: submit` fires when Save is clicked (the modal is only dirty-enabled, so a
 * submit always reflects a change to the selection); `outcome: cancel` fires when Cancel is
 * clicked or the modal is dismissed (X/Escape/backdrop), in which case the in-progress selection
 * is reverted. This is a pure local step with no backend call, so `success` is always `true` and
 * `error` is omitted.
 */
export const fireAutoragModelsSelected = (properties: ModelsSelectedProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.MODELS_SELECTED, properties);
};

/** Categorized vector I/O provider type, derived from the `SUPPORTED_VECTOR_STORE_PROVIDER_TYPES` allowlist. */
export type VectorStoreProviderType = 'milvus' | 'pgvector';

/**
 * Maps a raw `OgxVectorStoreProvider.provider_type` (e.g. `"remote::milvus"`) to the categorized
 * {@link VectorStoreProviderType} used in analytics. Returns `undefined` for any provider type
 * outside the current allowlist — callers must skip firing the tracking event in that case rather
 * than forwarding an uncategorized value. This keeps the tracked property to a fixed, non-sensitive
 * set even though the underlying `provider_id` is a free-form, admin-assigned string that must
 * never be sent to analytics.
 */
export const toVectorStoreProviderType = (
  providerType: string,
): VectorStoreProviderType | undefined => {
  switch (providerType) {
    case 'remote::milvus':
      return 'milvus';
    case 'remote::pgvector':
      return 'pgvector';
    default:
      return undefined;
  }
};

export type VectorStoreConfiguredProperties = {
  providerType: VectorStoreProviderType;
  countOfCompatibleProviders: number;
  outcome: TrackingOutcome;
  success: boolean;
};

/**
 * Fires when the user selects a vector I/O provider in the "Configure details" step of the
 * configure flow. Fires on every selection change (consistent with Knowledge/Evaluation Source,
 * which re-fire on every upload/replace), from the Select's `onSelect` handler only — never from
 * the effect that clears a stale selection when the provider list refreshes, and never from the
 * initial/reconfigure pre-fill of `vector_io_provider_id`. This is a pure local field selection
 * with no direct backend call, so `outcome` is always `submit` and `success` is always `true`.
 */
export const fireAutoragVectorStoreConfigured = (
  properties: VectorStoreConfiguredProperties,
): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.VECTOR_STORE_CONFIGURED, properties);
};
