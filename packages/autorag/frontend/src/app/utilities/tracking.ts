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
  RUN_RECONFIGURED: 'AutoRAG Run Reconfigured',
  RUN_STOPPED: 'AutoRAG Run Stopped',
  RUN_RETRIED: 'AutoRAG Run Retried',
  EXPERIMENT_DELETED: 'AutoRAG Experiment Deleted',
  FLOW_EXITED: 'AutoRAG Flow Exited',
  S3_CONNECTION_CREATED: 'AutoRAG S3 Connection Created',
  EVALUATION_TEMPLATE_DOWNLOADED: 'AutoRAG Evaluation Template Downloaded',
  RESULTS_VIEWED: 'AutoRAG Results Viewed',
  PLAYGROUND_OPENED: 'AutoRAG Playground Opened',
  NOTEBOOK_DOWNLOADED: 'AutoRAG Notebook Downloaded',
  RESULTS_COLUMN_TOGGLED: 'AutoRAG Results Column Toggled',
  PATTERN_DETAILS_VIEWED: 'AutoRAG Pattern Details Viewed',
  PATTERN_DETAILS_DOWNLOAD_INITIATED: 'AutoRAG Pattern Details Download Initiated',
  CODE_SNIPPETS_EXPORTED: 'AutoRAG Code Snippets Exported',
  LEADERBOARD_PRESET_APPLIED: 'AutoRAG Leaderboard Preset Applied',
  PATTERNS_COMPARED: 'AutoRAG Patterns Compared',
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
 * without a selection being made, in which case `success` is always `false` since no document
 * was actually configured.
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
 * without a selection being made, in which case `success` is always `false` since no document
 * was actually configured.
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
  'overallScore' | 'answerFaithfulness' | 'answerCorrectness' | 'contextCorrectness';

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
 * Converts the individual "did this section change vs. the source run" signals into the
 * `changedFields` list used by {@link fireAutoragRunReconfigured}. Centralized so the field-name
 * taxonomy — and the "actually reselected" vs. "value differs" distinction per field, see that
 * function's doc comment — lives in one tested place instead of being duplicated at each call
 * site.
 */
export const buildRunReconfiguredChangedFields = (signals: {
  knowledgeSourceTypeChanged: boolean;
  evaluationSourceTypeChanged: boolean;
  optimizationMetricChanged: boolean;
  vectorDatabaseChanged: boolean;
  modelsChanged: boolean;
}): string[] => {
  const changedFields: string[] = [];
  if (signals.knowledgeSourceTypeChanged) {
    changedFields.push('knowledgeSourceType');
  }
  if (signals.evaluationSourceTypeChanged) {
    changedFields.push('evaluationSourceType');
  }
  if (signals.optimizationMetricChanged) {
    changedFields.push('optimizationMetric');
  }
  if (signals.vectorDatabaseChanged) {
    changedFields.push('vectorDatabase');
  }
  if (signals.modelsChanged) {
    changedFields.push('models');
  }
  return changedFields;
};

export type RunReconfiguredProperties = {
  /**
   * Flagged in `changedFields` when the user actually (re)selected a knowledge source this
   * session — see {@link RunTriggeredProperties.knowledgeSourceType} for why this can't be a
   * plain value comparison. Reports the current selection the same way {@link
   * RunTriggeredProperties.knowledgeSourceType} does, so `undefined` here means the pre-filled
   * source was never re-selected through the UI.
   */
  knowledgeSourceType?: KnowledgeSourceType;
  /** See {@link RunReconfiguredProperties.knowledgeSourceType} — same caveat applies. */
  evaluationSourceType?: EvaluationSourceType;
  optimizationMetric?: RagOptimizationMetric;
  /** See {@link RunReconfiguredProperties.knowledgeSourceType} — same caveat applies. */
  vectorDatabase?: VectorStoreProviderType;
  countOfFoundationModels: number;
  countOfEmbeddingModels: number;
  /**
   * Which top-level sections differ from the source run's configuration at the time this event
   * fires — comma-joined by {@link fireAutoragRunReconfigured} before sending, since analytics
   * properties can't carry raw arrays. Built with {@link buildRunReconfiguredChangedFields}.
   */
  changedFields: string[];
  outcome: TrackingOutcome;
  /** Omitted on `outcome: cancel` — no backend call is made when the user cancels before submitting. */
  success?: boolean;
  error?: AutoragFailureCategory;
};

/**
 * Fires from the reconfigure flow only (`sourceRunId` set) — never for a new-run create. Fires
 * with `outcome: submit` when "Create new run" is clicked, alongside "AutoRAG Run Triggered"
 * (which fires for every submission, reconfigure or not, but does not report what changed), with
 * `success`/`error` reflecting the same pipeline-run creation result. Also fires with
 * `outcome: cancel` when the user cancels out of the flow from the "Define details" step before
 * ever submitting — before any backend call is made, so `success` is omitted in that case.
 */
export const fireAutoragRunReconfigured = (properties: RunReconfiguredProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.RUN_RECONFIGURED, {
    ...properties,
    changedFields: properties.changedFields.join(','),
  });
};

/**
 * Distinguishes which page/control a run action (stop, retry, delete, reconfigure) was
 * triggered from — the runs table's per-row kebab (`ActionsColumn`) menu on the experiments
 * list, or the standalone header button on the single-run results page.
 */
export type RunActionSource = 'runsList' | 'resultsPage';

export type RunOutcomeTrackingProperties = {
  outcome: TrackingOutcome;
  /** Omitted on `outcome: cancel` — no backend call is made when the confirmation modal is dismissed. */
  success?: boolean;
  error?: AutoragFailureCategory;
  source: RunActionSource;
};

/**
 * Fires from the "Stop pipeline run?" confirmation modal, reachable from either the runs table's
 * kebab menu (`source: 'runsList'`) or the results page's header button (`source: 'resultsPage'`).
 * `outcome: cancel` fires when the modal is dismissed (Cancel, X, Escape, backdrop) before the
 * stop request has been submitted — no backend call has been made yet, so `success` is omitted
 * in that case. `outcome: submit` fires once the terminate request resolves, with `success`/
 * `error` reflecting whether it succeeded.
 */
export const fireAutoragRunStopped = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.RUN_STOPPED, properties);
};

/**
 * Fires when the user retries a run via the runs table's kebab menu (`source: 'runsList'`) or
 * the results page's header button (`source: 'resultsPage'`). Unlike stop, retry has no
 * confirmation modal — it's a direct action — so this always fires with `outcome: submit`,
 * with `success`/`error` reflecting whether the retry request succeeded.
 */
export const fireAutoragRunRetried = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.RUN_RETRIED, properties);
};

/**
 * Fires from the "Delete AutoRAG optimization run?" confirmation modal, reachable from the
 * experiments list's kebab menu (`source: 'runsList'`). `outcome: cancel` fires when the modal
 * is dismissed (Cancel, X, Escape, backdrop) before the delete has been submitted — no backend
 * call has been made yet, so `success` is omitted in that case. `outcome: submit` fires once the
 * delete request resolves, with `success`/`error` reflecting whether it succeeded.
 */
export const fireAutoragExperimentDeleted = (properties: RunOutcomeTrackingProperties): void => {
  fireFormTrackingEvent(AUTORAG_EVENTS.EXPERIMENT_DELETED, properties);
};

/** Where the user came from when navigating to the results page. */
export type AutoragResultsEntrySource = 'experimentsList' | 'notification' | 'direct' | 'other';

/** Router `location.state` shape set by links/navigations that lead to the results page. */
export type AutoragResultsNavigationState = {
  entrySource: AutoragResultsEntrySource;
};

export const isAutoragResultsNavigationState = (
  state: unknown,
): state is AutoragResultsNavigationState => {
  if (!state || typeof state !== 'object' || !('entrySource' in state)) {
    return false;
  }
  const { entrySource } = state;
  return (
    entrySource === 'experimentsList' ||
    entrySource === 'notification' ||
    entrySource === 'direct' ||
    entrySource === 'other'
  );
};

/**
 * Fires once per run when the results page finishes loading a run. `entrySource` is read from
 * router state set by the link/navigation that brought the user here, falling back to `'other'`
 * when the page was reached without that state (e.g. a bookmarked/pasted URL or a page refresh).
 */
export const fireAutoragResultsViewed = (entrySource: AutoragResultsEntrySource): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.RESULTS_VIEWED, { entrySource });
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
  'experimentsList' | 'home' | 'projects' | 'otherGenAi' | 'none';

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

/**
 * Where the user opened the pattern chat/playground drawer from. `'other'` is part of the
 * taxonomy but is not currently fired by this package — every known "Try this pattern" entry
 * point maps to one of the other two values.
 */
export type PlaygroundOpenedSource = 'resultsTable' | 'patternDetails' | 'other';

/**
 * Fires when the user opens the pattern chat/playground drawer to try a pattern — from the
 * results table/leaderboard's "Try this pattern" action (`source: 'resultsTable'`) or from the
 * pattern details modal's "Try this pattern" action (`source: 'patternDetails'`). Does not fire
 * when the user switches patterns from the pattern select within an already-open playground
 * drawer — that's a pattern swap, not a new "open".
 */
export const fireAutoragPlaygroundOpened = (source: PlaygroundOpenedSource): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PLAYGROUND_OPENED, { source });
};

/**
 * Which artifact was downloaded from a pattern's "Save as notebook" actions. `'other'` is part
 * of the taxonomy but is not currently fired — the only two notebook types produced today are
 * `'indexing'` and `'inference'`.
 */
export type NotebookDownloadedType = 'indexing' | 'inference' | 'other';

/**
 * Fires when a pattern notebook has actually finished downloading (i.e. the S3 fetch succeeded
 * and the browser download was triggered) — from either the results table/leaderboard or the
 * pattern details modal's "Save as ... notebook" actions. Does not fire on a failed download
 * attempt, since the signal we care about is completed engagement, not the click itself.
 */
export const fireAutoragNotebookDownloaded = (notebookType: NotebookDownloadedType): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.NOTEBOOK_DOWNLOADED, { notebookType });
};

/**
 * Discrete, bounded identity for a results table column, independent of its (possibly dynamic
 * or API-driven) display label. Metric columns reuse the {@link RagOptimizationMetric} taxonomy
 * where possible; `'otherMetric'` covers metric columns outside that allowlist (e.g. a metric
 * the API returns that isn't one of the four known optimization metrics), and `'other'` is a
 * defensive catch-all for any future/unrecognized column — neither should leak a raw API value.
 */
export type ResultsColumnName =
  | 'rank'
  | 'patternName'
  | 'modelNames'
  | RagOptimizationMetric
  | 'otherMetric'
  | 'chunkingMethod'
  | 'chunkingChunkSize'
  | 'chunkingChunkOverlap'
  | 'retrievalMethod'
  | 'retrievalSearchMode'
  | 'retrievalRankerStrategy'
  | 'retrievalNumberOfChunks'
  | 'other';

/**
 * Fires once per column whose visibility actually changed when the user saves the "Manage
 * columns" modal — not on every checkbox click while the modal is open, so discarded edits
 * (Cancel) don't get counted. Reordering-only saves fire nothing, since no `isShown` changed.
 */
export const fireAutoragResultsColumnToggled = (
  columnName: ResultsColumnName,
  isVisible: boolean,
): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.RESULTS_COLUMN_TOGGLED, { columnName, isVisible });
};

/**
 * Where the user drilled into a pattern's details modal from. `'pipelineVis'` is part of the
 * taxonomy but is not currently fired — the pipeline topology view's step details drawer doesn't
 * yet offer a way to open the pattern details modal. `'other'` is a defensive catch-all for any
 * future entry point added before this taxonomy is updated.
 */
export type PatternDetailsEntrySource = 'resultsTable' | 'pipelineVis' | 'other';

/**
 * Fires when the pattern details modal is opened — from the results table/leaderboard's pattern
 * name link or "View details" row action (`source: 'resultsTable'`). Does not fire when
 * navigating between patterns (prev/next arrows or "Compare patterns") within an already-open
 * modal — that's in-session navigation, not a new "drill into details".
 */
export const fireAutoragPatternDetailsViewed = (source: PatternDetailsEntrySource): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PATTERN_DETAILS_VIEWED, { source });
};

/**
 * Fires when the user clicks "Download" in the pattern details modal header. That action opens
 * the browser's native print dialog (`window.print()`) rather than a direct file download, and
 * the dialog's `afterprint` event fires whether the user actually saves a PDF or cancels — so
 * there is no reliable "completed" signal to wait for. This fires on the click itself, same as
 * {@link fireAutoragEvaluationTemplateDownloaded}.
 */
export const fireAutoragPatternDetailsDownloadInitiated = (): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PATTERN_DETAILS_DOWNLOAD_INITIATED, {
    downloadType: 'patternDetails',
  });
};

/** Whether the user viewed or copied a "View code" (curl/Node.js/Go/Python) snippet. */
export type CodeSnippetAction = 'viewed' | 'copied';

/**
 * Where the "View code" modal was opened from: the Playground drawer's "View Code" button
 * (`'playground'`), a results-table row's "View code" kebab action (`'resultsTable'`), or the
 * pattern details modal's "View code" dropdown item (`'patternDetails'`). `'other'` is a
 * defensive catch-all for any future entry point added before this taxonomy is updated.
 */
export type ViewCodeEntrySource = 'playground' | 'resultsTable' | 'patternDetails' | 'other';

/**
 * Fires with `action: 'viewed'` and an `entrySource` when the "View code" modal is opened. Fires
 * once per open, regardless of which language tab is initially shown. Fires with
 * `action: 'copied'` (no `entrySource`) when the user clicks a tab's "Copy" button and the
 * clipboard write succeeds — not fired on a rejected clipboard write (e.g. denied permission);
 * which tab/entry point was copied from isn't tracked separately from the "viewed" event for the
 * same modal session.
 */
export const fireAutoragCodeSnippetsExported = (
  action: CodeSnippetAction,
  entrySource?: ViewCodeEntrySource,
): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.CODE_SNIPPETS_EXPORTED, {
    action,
    ...(entrySource ? { entrySource } : {}),
  });
};

/**
 * Discrete, bounded identity for a "Manage columns" quick-select preset, independent of its
 * display label. `'other'` is a defensive catch-all for any future preset added before this
 * taxonomy is updated.
 */
export type LeaderboardPresetType =
  'optimizationMetrics' | 'optimizationMetricsAndChunking' | 'fullConfiguration' | 'other';

/**
 * Fires when the user selects a preset from the "Manage columns" modal's "Quick select" control
 * (applying that preset's column set to the current view). Does not fire for the underlying
 * column visibility changes themselves — those are covered by
 * {@link fireAutoragResultsColumnToggled} on Save. Fires on selection, not gated by whether the
 * modal is subsequently saved or cancelled, since choosing the preset is itself the signal we
 * care about.
 */
export const fireAutoragLeaderboardPresetApplied = (presetType: LeaderboardPresetType): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.LEADERBOARD_PRESET_APPLIED, { presetType });
};

/**
 * Whether this comparison selection was the first one made after enabling "Compare patterns"
 * (`'initial'`), or a subsequent swap via "Change comparison" (`'changed'`) — surfaces whether
 * users settle on one comparison or keep exploring different pairings.
 */
export type PatternComparedInteractionType = 'initial' | 'changed';

/**
 * Rounds a raw score delta to 4 decimal places to avoid floating-point noise (e.g.
 * `0.45 - 0.66` producing `-0.21000000000000002`) leaking into analytics payloads.
 */
const roundScoreDifference = (value: number): number => Math.round(value * 10000) / 10000;

/**
 * Fires when the user confirms a pattern selection in the pattern details modal's comparison
 * select modal — both for the initial "Compare patterns" selection and for a subsequent "Change
 * comparison" swap to a different pattern. The comparison feature is a fixed 1-vs-1 pairing (a
 * single `comparisonPatternIndex`, not a multi-select), so there is no meaningful
 * "how many patterns at once" count to report — it is always exactly 2 (primary + comparison).
 *
 * `rankDifference` is signed: `comparisonRank - primaryRank`. Ranks are unique 1-based integers
 * (see `computePatternRankMap`), so this is always well-defined and comparable across every run
 * regardless of which metric is optimized.
 *
 * `scoreDifference` is signed: `comparisonScore - primaryScore` (each pattern's optimized-metric
 * mean score). Left as a raw number (rather than a bucketed 'better'/'worse'/'tie' category) for
 * full precision within a given run/metric — note that unlike `rankDifference`, raw score deltas
 * from different runs aren't necessarily on the same scale if they optimize different metrics, so
 * this field is best analyzed per-run/per-metric rather than aggregated wholesale across events.
 */
export const fireAutoragPatternsCompared = (
  interactionType: PatternComparedInteractionType,
  rankDifference: number,
  scoreDifference: number,
): void => {
  fireMiscTrackingEvent(AUTORAG_EVENTS.PATTERNS_COMPARED, {
    interactionType,
    rankDifference,
    scoreDifference: roundScoreDifference(scoreDifference),
  });
};
