import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Spinner, Bullseye } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TrainingJobDetailsTabs from './TrainingJobDetailsTabs';
import { useModelTrainingContext } from '../ModelTrainingContext';
import { PyTorchJobKind } from '../../k8sTypes';

const TrainingJobDetails: React.FC = () => {
  const { namespace, jobName } = useParams<{ namespace: string; jobName: string }>();
  const { pytorchJobs } = useModelTrainingContext();
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;

  // Find the specific job
  const job = React.useMemo(
    () => pytorchJobData.find((j: PyTorchJobKind) => j.metadata.name === jobName),
    [pytorchJobData, jobName],
  );

  if (!pytorchJobLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!job) {
    return (
      <ApplicationsPage
        empty
        emptyStatePage={
          <div>
            <h1>Training job not found</h1>
            <p>
              The training job &quot;{jobName}&quot; was not found in namespace &quot;{namespace}
              &quot;.
            </p>
          </div>
        }
        title="Training job not found"
        loaded={pytorchJobLoaded}
        loadError={pytorchJobLoadError}
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
      loadError={pytorchJobLoadError}
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
