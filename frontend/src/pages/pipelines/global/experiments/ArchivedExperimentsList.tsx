import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import createUsePipelineTable from '~/concepts/pipelines/content/tables/usePipelineTable';
import { useArchivedExperiments } from '~/concepts/pipelines/apiHooks/useExperiments';
import ArchivedExperimentTable from '~/concepts/pipelines/content/tables/experiment/ArchivedExperimentTable';
import { ExperimentListTabTitle } from '~/pages/pipelines/global/experiments/const';

const ArchivedExperimentsList: React.FC = () => {
  const [[{ items: experiments, totalSize }, loaded, error], { initialLoaded, ...tableProps }] =
    createUsePipelineTable(useArchivedExperiments)();

  if (error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText="There was an issue loading experiments"
            icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
            headingLevel="h2"
          />
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
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
          titleText="No archived experiments"
          icon={<EmptyStateIcon icon={CubesIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>
          When you are finished with an experiment, you can archive it in the{' '}
          {ExperimentListTabTitle.ACTIVE} tab. You can view the archived experiment here.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <ArchivedExperimentTable
      experiments={experiments}
      loading={!loaded}
      totalSize={totalSize}
      {...tableProps}
    />
  );
};
export default ArchivedExperimentsList;
