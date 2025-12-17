import React, { useRef, useState } from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Drawer,
  DrawerContent,
  DrawerContentBody,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ModelTrainingContext } from './ModelTrainingContext';
import ModelTrainingLoading from './ModelTrainingLoading';
import TrainingJobDetailsDrawer from './trainingJobDetailsDrawer/TrainingJobDetailsDrawer';
import TrainingJobListView from './trainingJobList/TrainingJobListView';
import DeleteTrainingJobModal from './trainingJobList/DeleteTrainingJobModal';
import { useTrainingJobStatuses } from './trainingJobList/hooks/useTrainingJobStatuses';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';
import { TrainJobKind } from '../k8sTypes';
import { TrainingJobState } from '../types';

const title = 'Training jobs';
const description =
  'Monitor the progress of model training jobs and manage distributed training workloads.';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { trainJobs, project, preferredProject, projects } = React.useContext(ModelTrainingContext);
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [selectedJob, setSelectedJob] = React.useState<TrainJobKind | undefined>(undefined);
  const [deleteTrainingJob, setDeleteTrainingJob] = useState<TrainJobKind | undefined>(undefined);
  const [togglingJobId, setTogglingJobId] = useState<string | undefined>(undefined);
  const drawerRef = useRef<HTMLDivElement>(undefined);

  // Manage job statuses at this level so they can be shared with drawer and list
  const { jobStatuses, updateJobStatus } = useTrainingJobStatuses(trainJobData);

  const handleSelectJob = React.useCallback((job: TrainJobKind) => {
    setSelectedJob((prev) => (prev?.metadata.uid === job.metadata.uid ? undefined : job));
  }, []);

  const handleStatusUpdate = React.useCallback(
    (jobId: string, newStatus: TrainingJobState) => {
      updateJobStatus(jobId, newStatus);
    },
    [updateJobStatus],
  );

  const handleDelete = React.useCallback(
    (job: TrainJobKind) => {
      setDeleteTrainingJob(job);
      // Close drawer if the deleted job is currently selected
      if (selectedJob?.metadata.uid === job.metadata.uid) {
        setSelectedJob(undefined);
      }
    },
    [selectedJob],
  );

  // Close drawer when project changes
  React.useEffect(() => {
    setSelectedJob(undefined);
  }, [project?.metadata.name]);

  // Sync selectedJob with the latest data from trainJobData when it updates
  React.useEffect(() => {
    if (selectedJob) {
      const updatedJob = trainJobData.find((job) => job.metadata.uid === selectedJob.metadata.uid);
      if (updatedJob && updatedJob !== selectedJob) {
        setSelectedJob(updatedJob);
      }
    }
  }, [trainJobData, selectedJob]);

  const isDrawerExpanded = !!selectedJob;
  const selectedJobDisplayName = selectedJob ? getDisplayNameFromK8sResource(selectedJob) : '';
  const selectedJobId = selectedJob ? selectedJob.metadata.uid || selectedJob.metadata.name : '';
  const selectedJobStatus = selectedJobId ? jobStatuses.get(selectedJobId) : undefined;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No training jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No training jobs have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const panelContent = (
    <TrainingJobDetailsDrawer
      job={selectedJob}
      displayName={selectedJobDisplayName}
      jobStatus={selectedJobStatus}
      onClose={() => setSelectedJob(undefined)}
      onDelete={handleDelete}
      onStatusUpdate={handleStatusUpdate}
      onTogglingChange={setTogglingJobId}
    />
  );

  return (
    <Drawer
      onExpand={() => drawerRef.current && drawerRef.current.focus()}
      isExpanded={isDrawerExpanded}
      isInline
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>
          <ApplicationsPage
            empty={trainJobData.length === 0}
            emptyStatePage={emptyState}
            title={
              <TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />
            }
            description={description}
            loadError={trainJobLoadError}
            loaded={trainJobLoaded}
            headerContent={
              <ModelTrainingProjectSelector
                getRedirectPath={(ns: string) => `/develop-train/training-jobs/${ns}`}
              />
            }
            provideChildrenPadding
            loadingContent={
              project ? undefined : (
                <ModelTrainingLoading
                  title="Loading"
                  description="Retrieving training jobs from all projects in the cluster. This can take a few minutes."
                  onCancel={() => {
                    const redirectProject = preferredProject ?? projects?.[0];
                    if (redirectProject) {
                      navigate(`/develop-train/training-jobs/${redirectProject.metadata.name}`);
                    }
                  }}
                />
              )
            }
          >
            <TrainingJobListView
              trainingJobs={trainJobData}
              jobStatuses={jobStatuses}
              onStatusUpdate={handleStatusUpdate}
              onSelectJob={handleSelectJob}
              togglingJobId={togglingJobId}
            />
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>

      {deleteTrainingJob && (
        <DeleteTrainingJobModal
          trainingJob={deleteTrainingJob}
          onClose={() => setDeleteTrainingJob(undefined)}
        />
      )}
    </Drawer>
  );
};

export default ModelTraining;
