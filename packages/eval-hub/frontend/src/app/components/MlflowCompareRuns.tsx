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

interface MlflowCompareRunsProps {
  experimentIds: string[];
  runUuids: string[];
  workspace?: string;
}

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

const MlflowCompareRunsRemote = React.lazy(() =>
  loadRemote<{ default: React.ComponentType<MlflowCompareRunsProps> }>(
    'mlflowEmbedded/MlflowCompareRunsWrapper',
  )
    .then((mod) => mod ?? { default: MlflowUnavailable })
    .catch(() => ({ default: MlflowUnavailable })),
);

const MlflowCompareRuns: React.FC<MlflowCompareRunsProps> = (props) => (
  <React.Suspense
    fallback={
      <Bullseye>
        <Spinner />
      </Bullseye>
    }
  >
    <MlflowCompareRunsRemote {...props} />
  </React.Suspense>
);

export default MlflowCompareRuns;
