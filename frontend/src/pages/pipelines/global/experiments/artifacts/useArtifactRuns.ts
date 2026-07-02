import React from 'react';
import { Artifact } from '#~/third_party/mlmd';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { extractRunIdFromUri } from './utils';

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
    if (!artifacts?.length) {
      return;
    }

    // Extract unique run IDs from all artifacts
    const runIds = new Set<string>();
    artifacts.forEach((artifact) => {
      const runId = extractRunIdFromUri(artifact.getUri());
      if (runId) {
        runIds.add(runId);
      }
    });

    // Fetch runs that we don't have cached AND aren't already in-flight
    // Note: We read runs/errors state but don't include them in deps to avoid infinite loops.
    // inFlightRef prevents concurrent duplicates; stale closure state is acceptable here
    // since we only care about deduping within the current render cycle.
    const runIdsToFetch = Array.from(runIds).filter(
      (id) => !(id in runs) && !(id in errors) && !inFlightRef.current.has(id),
    );

    if (runIdsToFetch.length === 0) {
      return;
    }

    // Mark as in-flight and loading
    runIdsToFetch.forEach((id) => inFlightRef.current.add(id));
    setLoading((prev) => new Set([...prev, ...runIdsToFetch]));

    // Fetch all runs in parallel
    Promise.all(
      runIdsToFetch.map((runId) =>
        api
          .getPipelineRun({}, runId)
          .then((run) => ({ runId, run, error: null }))
          .catch((error) => ({ runId, run: null, error })),
      ),
    ).then((results) => {
      // Remove from in-flight after fetch completes
      runIdsToFetch.forEach((id) => inFlightRef.current.delete(id));

      const newRuns: Record<string, PipelineRunKF | null> = {};
      const newErrors: Record<string, Error> = {};

      results.forEach(({ runId, run, error }) => {
        if (error) {
          newErrors[runId] = error;
        } else if (run) {
          newRuns[runId] = run;
        }
      });

      setRuns((prev) => ({ ...prev, ...newRuns }));
      setErrors((prev) => ({ ...prev, ...newErrors }));
      setLoading((prev) => {
        const next = new Set(prev);
        runIdsToFetch.forEach((id) => next.delete(id));
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifacts, api]);

  return { runs, errors, loading };
};
