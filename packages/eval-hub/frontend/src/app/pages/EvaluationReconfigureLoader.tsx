import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import { useEvaluationJob } from '~/app/hooks/useEvaluationJob';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { getCollections } from '~/app/api/k8s';
import { evaluationsBaseRoute } from '~/app/routes';
import extractReconfigureData from '~/app/utils/extractReconfigureData';
import type { Collection } from '~/app/types';
import StartEvaluationRunPage from './StartEvaluationRunPage';

const EvaluationReconfigureLoader: React.FC = () => {
  const { namespace, jobId } = useParams<{ namespace: string; jobId: string }>();

  const [job, jobLoaded, jobError] = useEvaluationJob(namespace, jobId);

  const { inferenceServices, loaded: isLoaded } = useInferenceServices(namespace ?? '');

  const collectionId = job?.collection?.id;
  const needsCollectionFetch = !!job?.collection && !job.collection.benchmarks?.length;

  const fetchCollection = React.useCallback<FetchStateCallbackPromise<Collection | null>>(
    (opts) => {
      if (!namespace || !collectionId || !needsCollectionFetch) {
        return Promise.reject(new NotReadyError('Collection fetch not needed'));
      }
      // TODO: RHOAIENG-84697 — use direct GET /collections/{id} once the BFF endpoint exists
      return getCollections('', { namespace })(opts).then((response) => {
        const match = response.items.find((c) => c.resource.id === collectionId);
        if (!match) {
          throw new Error(`Collection "${collectionId}" not found`);
        }
        return match;
      });
    },
    [namespace, collectionId, needsCollectionFetch],
  );

  const [resolvedCollection, collectionLoaded, collectionError] = useFetchState<Collection | null>(
    fetchCollection,
    null,
    { initialPromisePurity: true },
  );

  const collectionReady = !needsCollectionFetch || collectionLoaded;

  const loadError = jobError ?? collectionError;

  if (loadError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to load evaluation"
          status="danger"
          data-testid="reconfigure-load-error"
        >
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                component={(props) => <Link {...props} to={evaluationsBaseRoute(namespace)} />}
              >
                Return to evaluations
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!jobLoaded || !job || !isLoaded || !collectionReady) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading evaluation data" />
      </Bullseye>
    );
  }

  const initialValues = extractReconfigureData(
    job,
    inferenceServices,
    resolvedCollection ?? undefined,
  );

  return <StartEvaluationRunPage initialValues={initialValues} sourceJobId={jobId} />;
};

export default EvaluationReconfigureLoader;
