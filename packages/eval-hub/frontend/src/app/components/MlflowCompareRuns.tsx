import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { loadRemote } from '@module-federation/runtime';

export interface MlflowCompareRunsRemoteProps {
  experimentIds: string[];
  runUuids: string[];
  workspace?: string;
}

export interface MlflowCompareRunsProps extends MlflowCompareRunsRemoteProps {
  /**
   * Notified once the federated compare UI settles: `true` after the remote
   * component has rendered, `false` when the remote could not be loaded.
   */
  onRemoteReady?: (available: boolean) => void;
}

const REMOTE_NAME = 'mlflowEmbedded/MlflowCompareRunsWrapper';

/** Shown when the federated remote entry cannot be loaded (MF boundary only). */
const MlflowUnavailable: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationTriangleIcon}
    titleText="MLflow is currently unavailable"
    variant={EmptyStateVariant.lg}
    data-testid="mlflow-unavailable-empty-state"
  >
    <EmptyStateBody>
      The MLflow compare UI could not be loaded. Please check that MLflow is deployed and running,
      then try again.
    </EmptyStateBody>
  </EmptyState>
);

/**
 * Renders the federated MLflow run-comparison UI.
 *
 * The remote is loaded statefully (not via React.lazy, which permanently caches
 * a rejected promise) so a failed load can be reported through `onRemoteReady`
 * and a later mount can retry the load instead of staying unavailable for the
 * rest of the session.
 */
const MlflowCompareRuns: React.FC<MlflowCompareRunsProps> = ({ onRemoteReady, ...remoteProps }) => {
  const [remoteComponent, setRemoteComponent] =
    React.useState<React.ComponentType<MlflowCompareRunsRemoteProps> | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'loaded'>('loading');

  React.useEffect(() => {
    let cancelled = false;

    loadRemote<{ default: React.ComponentType<MlflowCompareRunsRemoteProps> }>(REMOTE_NAME)
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
        setRemoteComponent(null);
        setLoadState('loaded');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The remote component renders in the same commit that flips loadState, so a
  // `true` notification is only sent from a confirmed remote render.
  React.useEffect(() => {
    if (loadState === 'loaded') {
      onRemoteReady?.(remoteComponent !== null);
    }
  }, [loadState, remoteComponent, onRemoteReady]);

  if (loadState === 'loading') {
    return (
      <Bullseye>
        <Spinner data-testid="mlflow-compare-runs-loading" />
      </Bullseye>
    );
  }

  if (!remoteComponent) {
    return <MlflowUnavailable />;
  }

  const Remote = remoteComponent;
  return <Remote {...remoteProps} />;
};

export default MlflowCompareRuns;
