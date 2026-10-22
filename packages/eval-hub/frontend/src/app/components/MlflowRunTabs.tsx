import * as React from 'react';
import { Alert, AlertActionLink, Bullseye, Spinner } from '@patternfly/react-core';
import { loadRemote } from '@module-federation/runtime';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

export interface MlflowRunTabsProps {
  experimentId: string;
  runUuid: string;
  workspace?: string;
}

const REMOTE_NAME = 'mlflowEmbedded/MlflowRunTabsWrapper';

// Total attempts (initial load + silent retries) before the error state is shown.
const MAX_LOAD_ATTEMPTS = 3;
// Backoff between silent retries, multiplied by the attempt number (1s, 2s, ...).
const RETRY_DELAY_MS = 1000;

/**
 * Renders the federated MLflow run tabs for a benchmark run.
 *
 * The remote is loaded statefully (not via React.lazy, which permanently caches
 * a rejected promise) so that a load failure — e.g. a stale cached remote entry
 * referencing chunks the MLflow server no longer ships after an update, or a
 * transient MLflow blip while a new pod rolls out — is retried automatically
 * with backoff, and only surfaces as a retryable error once the retries are
 * exhausted, instead of a silently blank section.
 */
const MlflowRunTabs: React.FC<MlflowRunTabsProps> = (props) => {
  const [attempt, setAttempt] = React.useState(0);
  const [remoteComponent, setRemoteComponent] =
    React.useState<React.ComponentType<MlflowRunTabsProps> | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'loaded' | 'error'>('loading');

  React.useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    setLoadState('loading');

    const attemptLoad = (loadAttempt: number): void => {
      loadRemote<{ default: React.ComponentType<MlflowRunTabsProps> }>(REMOTE_NAME)
        .then((mod) => {
          if (cancelled) {
            return;
          }
          // Wrap in an updater: passing the component function directly would make
          // React call it as `setState(prev => component(prev))` and store its return
          // value instead of the component itself.
          setRemoteComponent(() => mod?.default ?? null);
          setLoadState('loaded');
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          if (loadAttempt < MAX_LOAD_ATTEMPTS) {
            // Transient failures often clear on a quick retry — stay in the
            // loading state and retry silently, with backoff, before showing
            // an error.
            retryTimer = setTimeout(
              () => attemptLoad(loadAttempt + 1),
              RETRY_DELAY_MS * loadAttempt,
            );
            return;
          }
          setLoadState('error');
          fireMiscTrackingEvent(EVAL_HUB_EVENTS.MLFLOW_RUN_TABS_LOAD_FAILED, {});
        });
    };

    attemptLoad(1);

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
      }
    };
  }, [attempt]);

  if (loadState === 'error') {
    return (
      <Alert
        isInline
        variant="danger"
        title="MLflow run charts could not be loaded"
        data-testid="mlflow-run-tabs-error"
        actionLinks={
          <>
            <AlertActionLink onClick={() => setAttempt((a) => a + 1)}>Try again</AlertActionLink>
            <AlertActionLink onClick={() => window.location.reload()}>Reload page</AlertActionLink>
          </>
        }
      >
        The MLflow charts for this run failed to load. This can happen temporarily after an MLflow
        server update. Try again, or reload the page.
      </Alert>
    );
  }

  if (loadState === 'loading') {
    return (
      <Bullseye>
        <Spinner data-testid="mlflow-run-tabs-loading" />
      </Bullseye>
    );
  }

  const Remote = remoteComponent;
  return Remote ? <Remote {...props} /> : null;
};

export default MlflowRunTabs;
