import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
  RAG_METRIC_OVERALL_SCORE,
} from '~/app/utilities/const';

export { TrackingOutcome };

export const AUTORAG_EVENTS = {
  PROJECT_DROPDOWN_OPTION_SELECTED: 'AutoRAG Project Dropdown Option Selected',
  EXPERIMENT_CREATED: 'AutoRAG Experiment Created',
  KNOWLEDGE_SOURCE_CONFIGURED: 'AutoRAG Knowledge Source Configured',
  EVALUATION_SOURCE_CONFIGURED: 'AutoRAG Evaluation Source Configured',
  MODELS_SELECTED: 'AutoRAG Models Selected',
  VECTOR_STORE_CONFIGURED: 'AutoRAG Vector Store Configured',
  RUN_TRIGGERED: 'AutoRAG Run Triggered',
  FLOW_EXITED: 'AutoRAG Flow Exited',
  S3_CONNECTION_CREATED: 'AutoRAG S3 Connection Created',
  EVALUATION_TEMPLATE_DOWNLOADED: 'AutoRAG Evaluation Template Downloaded',
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

/** Product-wide, camelCase taxonomy for the RAG optimization metric, independent of the schema's snake_case values. */
export type RagOptimizationMetric =
  | 'overallScore'
  | 'answerFaithfulness'
  | 'answerCorrectness'
  | 'contextCorrectness';

/* eslint-disable camelcase -- keys mirror the schema's snake_case optimization_metric values */
const RAG_OPTIMIZATION_METRIC_MAP: Record<string, RagOptimizationMetric> = {
  [RAG_METRIC_OVERALL_SCORE]: 'overallScore',
  [RAG_METRIC_FAITHFULNESS]: 'answerFaithfulness',
  [RAG_METRIC_ANSWER_CORRECTNESS]: 'answerCorrectness',
  [RAG_METRIC_CONTEXT_CORRECTNESS]: 'contextCorrectness',
};
/* eslint-enable camelcase */

/**
 * Maps the schema's `optimization_metric` value (e.g. `"answer_correctness"`) to the camelCase
 * {@link RagOptimizationMetric} taxonomy used in analytics. Returns `undefined` for any value
 * outside the current allowlist (defensive only — the schema's zod enum already restricts the
 * field to these four values).
 */
export const mapOptimizationMetric = (metric: string): RagOptimizationMetric | undefined =>
  Object.prototype.hasOwnProperty.call(RAG_OPTIMIZATION_METRIC_MAP, metric)
    ? RAG_OPTIMIZATION_METRIC_MAP[metric]
    : undefined;

export type RunTriggeredProperties = {
  /**
   * Only known when the corresponding source was actually (re)selected in this session — see
   * {@link RunTriggeredTrackingContext}. `undefined` on a reconfigure run submitted without
   * touching that field (the pre-filled value was never re-selected through the UI).
   */
  knowledgeSourceType?: KnowledgeSourceType;
  /** See {@link RunTriggeredProperties.knowledgeSourceType} — same caveat applies. */
  evaluationSourceType?: EvaluationSourceType;
  optimizationMetric?: RagOptimizationMetric;
  /** See {@link RunTriggeredProperties.knowledgeSourceType} — same caveat applies. */
  vectorDatabase?: VectorStoreProviderType;
  countOfModels: number;
  countOfKnowledgeDocuments: number;
  countOfEvaluationDocuments: number;
  countOfFoundationModels: number;
  countOfEmbeddingModels: number;
  /** True when at least one of the knowledge/evaluation sources was configured via an S3 connection (as opposed to a direct upload). */
  hasS3Connection: boolean;
  outcome: TrackingOutcome;
  success: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires when the user submits the "Create run"/"Create new run" button on the configure step,
 * covering both new-run and reconfigure submissions. There is no cancel path for this specific
 * action (the Back button returns to the previous step rather than abandoning the run), so
 * `outcome` is always `submit`; `success`/`error` distinguish a successful pipeline-run creation
 * from a failed one.
 */
export const fireAutoragRunTriggered = (properties: RunTriggeredProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.RUN_TRIGGERED, properties);
};

/**
 * Identifies where the user was in the configure flow when they exited without completing it.
 * `'knowledge'`, `'evaluation'`, and `'models'` only apply to the create-run flow, where these
 * milestones (see {@link fireAutoragKnowledgeSourceConfigured}, {@link
 * fireAutoragEvaluationSourceConfigured}, {@link fireAutoragModelsSelected}) are reached
 * progressively as the user actually completes each one — order-independent, since the configure
 * screen doesn't gate these sections sequentially the way automl's did. `'run'` is reached once
 * all three have been completed at least once this session. In the reconfigure flow the entire
 * configure screen is already fully populated on mount, so there's no equivalent progression to
 * observe — reconfigure reports `'run'` immediately upon reaching the configure screen, since the
 * form starts ready to submit.
 */
export type AutoragFunnelStep = 'defineDetails' | 'knowledge' | 'evaluation' | 'models' | 'run';

/**
 * Where the user ended up after exiting the configure flow. `'none'` covers cases (e.g. tab
 * close) where the destination can't be determined. `'home'` and `'projects'` are part of the
 * taxonomy but are not currently fired by this package — see {@link fireAutoragFlowExited}.
 */
export type AutoragExitDestination =
  | 'experimentsList'
  | 'home'
  | 'projects'
  | 'otherGenAi'
  | 'none';

/**
 * Fires when the user leaves the configure flow before creating a run — either via an explicit
 * in-app action (Cancel, breadcrumb) or by abandoning the tab/browser entirely. Not fired on a
 * successful run creation, nor when navigating between steps within the flow (e.g. Back).
 *
 * Only Cancel, the "AutoRAG: {namespace}" breadcrumb, the source-run breadcrumb (reconfigure from
 * results), and a full page/tab close (`beforeunload`) are covered — these fire `exitDestination`
 * values of `'experimentsList'`, `'otherGenAi'`, and `'none'` respectively. `'home'` and
 * `'projects'` are not fired: detecting an in-app navigation to the host dashboard's global nav
 * (Home, Projects, or another Gen AI Studio app) would require intercepting route changes, which
 * isn't available here — this app uses a plain `<BrowserRouter>`, not a data router, so React
 * Router's `useBlocker` can't be used.
 */
export const fireAutoragFlowExited = (
  exitType: 'abandon' | 'navigate',
  lastFunnelStep: AutoragFunnelStep,
  exitDestination: AutoragExitDestination,
): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.FLOW_EXITED, {
    exitType,
    lastFunnelStep,
    exitDestination,
  });
};

export type S3ConnectionCreatedProperties = {
  outcome: TrackingOutcome;
  /** Omitted on `outcome: cancel` — no backend call is made when the modal is dismissed. */
  success?: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires from the "Add new connection" modal reached from the "Knowledge setup" S3 connection
 * field on the configure step. `outcome: submit` fires as soon as the underlying Secret is
 * created (success or failure) — independent of what the caller's `onSubmit` does with it
 * afterward, so a later, unrelated failure there can't overwrite an already-successful creation.
 * `outcome: cancel` fires when the modal is dismissed (Cancel, X, Escape, backdrop) before the
 * Secret has been created; dismissal is blocked entirely while creation is in flight, and no
 * cancel is fired once creation has already succeeded or failed, since that outcome was already
 * reported.
 */
export const fireAutoragS3ConnectionCreated = (properties: S3ConnectionCreatedProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.S3_CONNECTION_CREATED, properties);
};

/**
 * Fires when the user clicks "Download template" in the Evaluation data template modal. The
 * download itself is a synchronous, client-side Blob creation with no network call or possible
 * rejection, so this fires immediately after the download is triggered — there is no separate
 * "completed" signal to wait for.
 */
export const fireAutoragEvaluationTemplateDownloaded = (): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.EVALUATION_TEMPLATE_DOWNLOADED, {
    downloadType: 'evaluationTemplate',
  });
};
