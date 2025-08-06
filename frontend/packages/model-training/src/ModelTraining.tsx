import React from 'react';
import {
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';

const title = 'Model training';
const description =
  'Train and fine-tune machine learning models using distributed training frameworks. Create training jobs, monitor progress, and manage training experiments across your data science projects.';

const ModelTraining = (): React.ReactElement => {
  // Placeholder data - in real implementation this would come from hooks
  const trainingJobs: unknown[] = [];
  const loaded = true;
  const loadError = undefined;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No training jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No training jobs have been started yet. Create a new training job to get started with model
        training and experimentation.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          {/* TODO: Add CreateTrainingJobButton component */}
          {/* <CreateTrainingJobButton /> */}
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={trainingJobs.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />}
      description={description}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      {/* TODO: Add TrainingJobsList component */}
      <div>Training jobs list will go here</div>
    </ApplicationsPage>
  );
};

export default ModelTraining;
