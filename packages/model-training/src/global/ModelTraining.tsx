import React, { useRef } from 'react';
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
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ModelTrainingContext } from './ModelTrainingContext';
import ModelTrainingLoading from './ModelTrainingLoading';
import TrainingJobDetailsDrawer from './trainingJobDetailsDrawer/TrainingJobDetailsDrawer';
import TrainingJobListView from './trainingJobList/TrainingJobListView';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';
import { TrainJobKind } from '../k8sTypes';

const title = 'Training jobs';
const description =
  'Select a project to view its training jobs. Monitor training progress and manage distributed training workloads across your data science projects.';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { trainJobs, project, preferredProject, projects } = React.useContext(ModelTrainingContext);
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [selectedJob, setSelectedJob] = React.useState<TrainJobKind | undefined>(undefined);
  const drawerRef = useRef<HTMLDivElement>(undefined);

  const handleSelectJob = React.useCallback((job: TrainJobKind) => {
    setSelectedJob((prev) => (prev?.metadata.uid === job.metadata.uid ? undefined : job));
  }, []);

  const isDrawerExpanded = !!selectedJob;
  const selectedJobDisplayName = selectedJob ? getDisplayNameFromK8sResource(selectedJob) : '';

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
      onClose={() => setSelectedJob(undefined)}
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
            <TrainingJobListView trainingJobs={trainJobData} onSelectJob={handleSelectJob} />
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ModelTraining;
