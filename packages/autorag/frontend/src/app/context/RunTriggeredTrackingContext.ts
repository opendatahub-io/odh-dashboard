import * as React from 'react';
import type {
  KnowledgeSourceType,
  EvaluationSourceType,
  VectorStoreProviderType,
} from '~/app/utilities/tracking';

export type RunTriggeredTrackingContextProps = {
  /** Records the most recent successful knowledge-source selection, for use at submit time on the "AutoRAG Run Triggered" event, and advances the "AutoRAG Flow Exited" funnel step. */
  onKnowledgeSourceConfigured: (sourceType: KnowledgeSourceType) => void;
  /** Records the most recent successful evaluation-source selection, for use at submit time on the "AutoRAG Run Triggered" event, and advances the "AutoRAG Flow Exited" funnel step. */
  onEvaluationSourceConfigured: (sourceType: EvaluationSourceType) => void;
  /** Records the most recently selected vector store provider type, for use at submit time on the "AutoRAG Run Triggered" event. */
  onVectorStoreConfigured: (providerType: VectorStoreProviderType) => void;
  /** Reports that the model configuration modal was saved, to advance the "AutoRAG Flow Exited" funnel step. Unlike the other callbacks, this carries no payload — model counts are read directly from form data at submit time. */
  onModelsConfigured: () => void;
};

const noop = (): void => {
  /* no-op default so consumers rendered outside a provider (e.g. isolated unit tests) don't need guards */
};

const defaultValue: RunTriggeredTrackingContextProps = {
  onKnowledgeSourceConfigured: noop,
  onEvaluationSourceConfigured: noop,
  onVectorStoreConfigured: noop,
  onModelsConfigured: noop,
};

/**
 * Lets the Knowledge/Evaluation/Vector-store/Models sections (nested several levels below
 * `AutoragConfigurePage`) report their last successful selection up to the page. Two things are
 * derived from these reports: the *category* of the selection (s3 vs upload, provider type),
 * needed at submit time to build the "AutoRAG Run Triggered" event — this category is
 * intentionally never stored in form state, only the resulting file key/provider ID is, so this
 * context is the only safe way to recover it without re-deriving it (unsafely) from form data —
 * and progress through the "AutoRAG Flow Exited" event's funnel steps. Falls back to no-ops
 * outside a provider.
 */
export const RunTriggeredTrackingContext =
  React.createContext<RunTriggeredTrackingContextProps>(defaultValue);

export const useRunTriggeredTracking = (): RunTriggeredTrackingContextProps =>
  React.useContext(RunTriggeredTrackingContext);
