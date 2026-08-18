import * as React from 'react';
import type {
  KnowledgeSourceType,
  EvaluationSourceType,
  VectorStoreProviderType,
} from '~/app/utilities/tracking';

export type RunTriggeredTrackingContextProps = {
  /** Records the most recent successful knowledge-source selection, for use at submit time on the "AutoRAG Run Triggered" event. */
  onKnowledgeSourceConfigured: (sourceType: KnowledgeSourceType) => void;
  /** Records the most recent successful evaluation-source selection, for use at submit time on the "AutoRAG Run Triggered" event. */
  onEvaluationSourceConfigured: (sourceType: EvaluationSourceType) => void;
  /** Records the most recently selected vector store provider type, for use at submit time on the "AutoRAG Run Triggered" event. */
  onVectorStoreConfigured: (providerType: VectorStoreProviderType) => void;
};

const noop = (): void => {
  /* no-op default so consumers rendered outside a provider (e.g. isolated unit tests) don't need guards */
};

const defaultValue: RunTriggeredTrackingContextProps = {
  onKnowledgeSourceConfigured: noop,
  onEvaluationSourceConfigured: noop,
  onVectorStoreConfigured: noop,
};

/**
 * Lets the Knowledge/Evaluation/Vector-store selectors (nested several levels below
 * `AutoragConfigurePage`) report the *category* of their last successful selection up to the
 * page, which needs it at submit time to build the "AutoRAG Run Triggered" event. This
 * category (s3 vs upload, provider type) is intentionally never stored in form state — only
 * the resulting file key/provider ID is — so this context is the only safe way to recover it
 * without re-deriving it (unsafely) from form data. Falls back to no-ops outside a provider.
 */
export const RunTriggeredTrackingContext =
  React.createContext<RunTriggeredTrackingContextProps>(defaultValue);

export const useRunTriggeredTracking = (): RunTriggeredTrackingContextProps =>
  React.useContext(RunTriggeredTrackingContext);
