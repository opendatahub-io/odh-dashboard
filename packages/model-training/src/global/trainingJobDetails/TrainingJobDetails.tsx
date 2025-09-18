import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Spinner,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TrainingJobDetailsTabs from './TrainingJobDetailsTabs';
import { useModelTrainingContext } from '../ModelTrainingContext';
import { PyTorchJobKind } from '../../k8sTypes';

const ErrorContent: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Unable to load training job details"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => navigate(`/modelTraining/${namespace ?? ''}`)}>
              Return to model training
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};

const TrainingJobDetails: React.FC = () => {
  const { namespace, jobName } = useParams<{ namespace: string; jobName: string }>();
  const navigate = useNavigate();
  const { pytorchJobs } = useModelTrainingContext();
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;

  // Find the specific job
  const job = React.useMemo(
    () => pytorchJobData.find((j: PyTorchJobKind) => j.metadata.name === jobName),
    [pytorchJobData, jobName],
  );

  // Handle load errors
  if (pytorchJobLoadError) {
    return <ErrorContent error={pytorchJobLoadError} />;
  }

  if (!pytorchJobLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  // Handle job not found
  if (!job) {
    return (
      <ErrorContent
        error={new Error(`Training job "${jobName}" not found in namespace "${namespace}".`)}
      />
    );
  }

  const displayName =
    job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;

  return (
    <ApplicationsPage
      empty={false}
      title={displayName}
      description={`PyTorch training job in ${namespace ?? ''}`}
      loaded={pytorchJobLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={`/modelTraining/${namespace ?? ''}`}>Model training</Link>}
          />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <TrainingJobDetailsTabs job={job} />
    </ApplicationsPage>
  );
};

export default TrainingJobDetails;
