import React from 'react';
import { Artifact } from '#~/third_party/mlmd';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getGenericErrorCode } from '#~/api/errorUtils';
import { PipelineAPIError } from '#~/api/pipelines/errorUtils';
import { extractRunIdFromUri } from './utils';

export type GrpcNotFoundError = {
  code: 5;
  message: string;
  details?: unknown[];
};

export const isGrpcNotFoundError = (value: unknown): value is GrpcNotFoundError => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('code' in value) || !('message' in value)) {
    return false;
  }
  return typeof value.code === 'number' && value.code === 5 && typeof value.message === 'string';
};

// Type guard to verify response is a valid PipelineRunKF and not a gRPC error.
// Checks runtime types of fields ArtifactRunCell renders (run_id, display_name).
export const isPipelineRunKF = (value: unknown): value is PipelineRunKF => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('run_id' in value) || !('display_name' in value) || 'code' in value) {
    return false;
  }
  return typeof value.run_id === 'string' && typeof value.display_name === 'string';
};

const boundRecord = <T>(prev: Record<string, T>, keep: Set<string>): Record<string, T> => {
  let changed = false;
  const next: Record<string, T> = {};
  for (const key of Object.keys(prev)) {
    if (keep.has(key)) {
      next[key] = prev[key];
    } else {
      changed = true;
    }
  }
  return changed ? next : prev;
};

const boundSet = (prev: Set<string>, keep: Set<string>): Set<string> => {
  let changed = false;
  const next = new Set<string>();
  for (const id of prev) {
    if (keep.has(id)) {
      next.add(id);
    } else {
      changed = true;
    }
  }
  return changed ? next : prev;
};

/**
 * Fetch pipeline runs for all artifacts, deduplicating requests by run ID.
 * Returns a cache of runs keyed by run ID.
 */
export const useArtifactRuns = (
  artifacts: Artifact[] | null | undefined,
): {
  runs: Record<string, PipelineRunKF | null>;
  errors: Record<string, Error>;
  loading: Set<string>;
} => {
  const { api } = usePipelinesAPI();
  const [runs, setRuns] = React.useState<Record<string, PipelineRunKF | null>>({});
  const [errors, setErrors] = React.useState<Record<string, Error>>({});
  const [loading, setLoading] = React.useState<Set<string>>(new Set());

  // Track which run IDs are currently in-flight to avoid concurrent duplicate fetches
  const inFlightRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    // Extract unique run IDs from the current artifact set
    const runIds = new Set<string>();
    artifacts?.forEach((artifact) => {
      const runId = extractRunIdFromUri(artifact.getUri());
      if (runId) {
        runIds.add(runId);
      }
    });

    // Drop cached runs/errors/loading that are no longer referenced (pagination, filters)
    setRuns((prev) => boundRecord(prev, runIds));
    setErrors((prev) => boundRecord(prev, runIds));
    setLoading((prev) => boundSet(prev, runIds));

    if (runIds.size === 0) {
      return;
    }

    // Fetch runs that we don't have cached AND aren't already in-flight
    // Note: We read runs/errors state but don't include them in deps to avoid infinite loops.
    // inFlightRef prevents concurrent duplicates; stale closure state is acceptable here
    // since we only care about deduping within the current render cycle.
    //
    // We distinguish between permanent (404) and retryable errors:
    // - 404: run was deleted, will never exist -> don't retry
    // - Network/5xx: transient failure -> allow retry on component remount or page reload
    const runIdsToFetch = Array.from(runIds).filter((id) => {
      if (id in runs) {
        return false; // Already have the run
      }
      if (inFlightRef.current.has(id)) {
        return false; // Currently fetching
      }
      if (id in errors) {
        // Allow retry for retryable errors (network, 5xx), but not 404 (run deleted)
        const errorCode = getGenericErrorCode(errors[id]);
        if (errorCode === 404) {
          return false; // Permanent error, don't retry
        }
        // For other errors (network, 5xx, etc.), allow retry on remount
      }
      return true;
    });

    if (runIdsToFetch.length === 0) {
      return;
    }

    // Create AbortController for cleanup on unmount or when artifacts/api change
    const abortController = new AbortController();
    // Capture current in-flight ref for cleanup (before async work mutates it)
    const inFlightSet = inFlightRef.current;

    // Mark as in-flight and loading
    runIdsToFetch.forEach((id) => inFlightSet.add(id));
    setLoading((prev) => new Set([...prev, ...runIdsToFetch]));

    // Fetch all runs in parallel with abort signal for cleanup
    Promise.all(
      runIdsToFetch.map((runId) =>
        api
          .getPipelineRun({ signal: abortController.signal }, runId)
          .then((response): { runId: string; run: PipelineRunKF | null; error: Error | null } => {
            // Check if the response is actually a gRPC error without 'error' field
            // (e.g., {code: 5, message: "...", details: [...]})
            if (isGrpcNotFoundError(response)) {
              const error = new PipelineAPIError(response.message, 404);
              return { runId, run: null, error };
            }
            // Verify response is a valid PipelineRunKF for the requested run before caching
            // (some gRPC errors with other codes might also bypass handlePipelineFailures)
            if (!isPipelineRunKF(response) || response.run_id !== runId) {
              return { runId, run: null, error: new Error('Invalid response from pipeline API') };
            }
            return { runId, run: response, error: null };
          })
          .catch((error) => ({ runId, run: null, error })),
      ),
    ).then((results) => {
      // Skip state updates if the component unmounted or effect was cleaned up
      if (abortController.signal.aborted) {
        return;
      }

      // Remove from in-flight after fetch completes
      runIdsToFetch.forEach((id) => inFlightSet.delete(id));

      const newRuns: Record<string, PipelineRunKF | null> = {};
      const newErrors: Record<string, Error> = {};

      results.forEach(({ runId, run, error }) => {
        if (error) {
          newErrors[runId] = error;
        } else if (run) {
          newRuns[runId] = run;
        }
      });

      setRuns((prev) => boundRecord({ ...prev, ...newRuns }, runIds));
      setErrors((prev) => {
        // Remove errors for runs that were successfully fetched on retry
        const next = { ...prev, ...newErrors };
        Object.keys(newRuns).forEach((id) => delete next[id]);
        return boundRecord(next, runIds);
      });
      setLoading((prev) => {
        const next = new Set(prev);
        runIdsToFetch.forEach((id) => next.delete(id));
        return boundSet(next, runIds);
      });
    });

    // Cleanup: abort ongoing fetches when component unmounts or dependencies change
    return () => {
      abortController.abort();
      // Clean up in-flight tracking for aborted requests
      runIdsToFetch.forEach((id) => inFlightSet.delete(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifacts, api]);

  return { runs, errors, loading };
};
