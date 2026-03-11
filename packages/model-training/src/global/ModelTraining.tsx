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
import RayJobDetailsDrawer from './rayJobDetailsDrawer/RayJobDetailsDrawer';
import JobsListView from './trainingJobList/JobsListView';
import DeleteJobModal from './trainingJobList/DeleteJobModal';
import { useJobStatuses } from './trainingJobList/hooks/useJobStatuses';
import { getUnifiedJobNodeCount } from './trainingJobList/utils';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';
import { RayClusterKind } from '../k8sTypes';
import { TrainingJobState, UnifiedJobKind, isTrainJob, isRayJob } from '../types';
import { useRayClusters } from '../api';

const title = 'Jobs';
const description =
  'Monitor the progress of TrainJobs and RayJobs, and manage distributed training and computing workloads.';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { trainJobs, rayJobs, project, preferredProject, projects } =
    React.useContext(ModelTrainingContext);
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;
  const [selectedJob, setSelectedJob] = React.useState<UnifiedJobKind | undefined>(undefined);
  const [jobToDelete, setJobToDelete] = useState<UnifiedJobKind | undefined>(undefined);
  const [togglingJobId, setTogglingJobId] = useState<string | undefined>(undefined);
  const drawerRef = useRef<HTMLDivElement>(undefined);

  const allJobs: UnifiedJobKind[] = React.useMemo(
    () => [...trainJobData, ...rayJobData],
    [trainJobData, rayJobData],
  );
  const allJobsLoaded = trainJobLoaded && rayJobLoaded;
  const allJobsLoadError = trainJobLoadError || rayJobLoadError;

  const hasWorkspaceRayJobs = React.useMemo(
    () =>
      rayJobData.some(
        (job) => !job.spec.rayClusterSpec && job.spec.clusterSelector?.['ray.io/cluster'],
      ),
    [rayJobData],
  );

  const [rayClusterData] = useRayClusters(
    hasWorkspaceRayJobs ? project?.metadata.name ?? '' : null,
  );

  const nodeCountMap = React.useMemo(() => {
    const rayClustersMap = hasWorkspaceRayJobs
      ? new Map<string, RayClusterKind>(
          rayClusterData.map((cluster) => [cluster.metadata.name, cluster]),
        )
      : undefined;

    const map = new Map<string, number>();
    for (const job of allJobs) {
      const jobId = job.metadata.uid || job.metadata.name;
      map.set(jobId, getUnifiedJobNodeCount(job, rayClustersMap));
    }
    return map;
  }, [allJobs, hasWorkspaceRayJobs, rayClusterData]);

  const { jobStatuses, updateJobStatus } = useJobStatuses(allJobs);

  const handleSelectJob = React.useCallback((job: UnifiedJobKind) => {
    const jobId = job.metadata.uid || job.metadata.name;
    setSelectedJob((prev) =>
      (prev?.metadata.uid || prev?.metadata.name) === jobId ? undefined : job,
    );
  }, []);

  const handleStatusUpdate = React.useCallback(
    (jobId: string, newStatus: TrainingJobState) => {
      updateJobStatus(jobId, newStatus);
    },
    [updateJobStatus],
  );

  const handleDelete = React.useCallback((job: UnifiedJobKind) => {
    setJobToDelete(job);
  }, []);

  React.useEffect(() => {
    setSelectedJob(undefined);
  }, [project?.metadata.name]);

  React.useEffect(() => {
    if (selectedJob) {
      const dataSource = isTrainJob(selectedJob) ? trainJobData : rayJobData;
      const selectedId = selectedJob.metadata.uid || selectedJob.metadata.name;
      const updatedJob = dataSource.find(
        (job) => (job.metadata.uid || job.metadata.name) === selectedId,
      );
      if (!updatedJob) {
        setSelectedJob(undefined);
      } else if (updatedJob !== selectedJob) {
        setSelectedJob(updatedJob);
      }
    }
  }, [trainJobData, rayJobData, selectedJob]);

  const isDrawerExpanded = !!selectedJob;
  const selectedJobDisplayName = selectedJob ? getDisplayNameFromK8sResource(selectedJob) : '';
  const selectedJobId = selectedJob ? selectedJob.metadata.uid || selectedJob.metadata.name : '';
  const selectedJobStatus = selectedJobId ? jobStatuses.get(selectedJobId) : undefined;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No TrainJobs or RayJobs have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const selectedTrainJob = selectedJob && isTrainJob(selectedJob) ? selectedJob : undefined;
  const selectedRayJob = selectedJob && isRayJob(selectedJob) ? selectedJob : undefined;

  const panelContent = selectedRayJob ? (
    <RayJobDetailsDrawer
      job={selectedRayJob}
      displayName={selectedJobDisplayName}
      onClose={() => setSelectedJob(undefined)}
      onDelete={handleDelete}
    />
  ) : (
    <TrainingJobDetailsDrawer
      job={selectedTrainJob}
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
            empty={allJobs.length === 0}
            emptyStatePage={emptyState}
            title={
              <TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />
            }
            description={description}
            loadError={allJobsLoadError}
            loaded={allJobsLoaded}
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
                  description="Retrieving jobs from all projects in the cluster. This can take a few minutes."
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
            <JobsListView
              jobs={allJobs}
              jobStatuses={jobStatuses}
              nodeCountMap={nodeCountMap}
              onStatusUpdate={handleStatusUpdate}
              onSelectJob={handleSelectJob}
              onDelete={handleDelete}
              togglingJobId={togglingJobId}
            />
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>

      {jobToDelete && (
        <DeleteJobModal
          job={jobToDelete}
          onClose={(deleted) => {
            setJobToDelete(undefined);
            if (deleted && selectedJob && selectedJob.metadata.uid === jobToDelete.metadata.uid) {
              setSelectedJob(undefined);
            }
          }}
        />
      )}
    </Drawer>
  );
};

export default ModelTraining;
