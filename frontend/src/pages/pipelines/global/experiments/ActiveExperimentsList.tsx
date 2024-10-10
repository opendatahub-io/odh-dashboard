import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import createUsePipelineTable from '~/concepts/pipelines/content/tables/usePipelineTable';
import { useActiveExperiments } from '~/concepts/pipelines/apiHooks/useExperiments';
import ActiveExperimentTable from '~/concepts/pipelines/content/tables/experiment/ActiveExperimentTable';
import CreateExperimentButton from '~/concepts/pipelines/content/experiment/CreateExperimentButton';
import ExperimentLoadingError from '~/concepts/pipelines/content/experiments/ExperimentLoadingError';

const ActiveExperimentsList: React.FC = () => {
  const [[{ items: experiments, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    createUsePipelineTable(useActiveExperiments)();

  if (error) {
    return <ExperimentLoadingError error={error} />;
  }

  if (!loaded && !initialLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loaded && totalSize === 0 && !tableProps.filter) {
    return (
      <EmptyState data-testid="global-no-experiments">
        <EmptyStateHeader
          titleText="No active experiments"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>Click the button below to create a new active experiment.</EmptyStateBody>
        <EmptyStateFooter>
          <CreateExperimentButton />
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <ActiveExperimentTable
      experiments={experiments}
      loading={!loaded}
      totalSize={totalSize}
      {...tableProps}
    />
  );
};
export default ActiveExperimentsList;
