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
import { useEvaluationJob } from '~/app/hooks/useEvaluationJob';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { evaluationsBaseRoute } from '~/app/routes';
import extractReconfigureData from '~/app/utils/extractReconfigureData';
import StartEvaluationRunPage from './StartEvaluationRunPage';

const EvaluationReconfigureLoader: React.FC = () => {
  const { namespace, jobId } = useParams<{ namespace: string; jobId: string }>();

  const [job, jobLoaded, jobError] = useEvaluationJob(namespace, jobId);

  const { inferenceServices, loaded: isLoaded } = useInferenceServices(namespace ?? '');

  if (jobError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to load evaluation"
          status="danger"
          data-testid="reconfigure-load-error"
        >
          <EmptyStateBody>{jobError.message}</EmptyStateBody>
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

  if (!jobLoaded || !job || !isLoaded) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading evaluation data" />
      </Bullseye>
    );
  }

  const initialValues = extractReconfigureData(job, inferenceServices);

  return <StartEvaluationRunPage initialValues={initialValues} sourceJobId={jobId} />;
};

export default EvaluationReconfigureLoader;
