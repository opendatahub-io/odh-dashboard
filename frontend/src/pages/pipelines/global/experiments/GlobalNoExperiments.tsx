import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CubesIcon, PlusCircleIcon } from '@patternfly/react-icons';
import CreateExperimentButton from '~/concepts/pipelines/content/experiment/CreateExperimentButton';
import { ExperimentListTabs } from './const';

type GlobalNoExperimentsProps = {
  tab: ExperimentListTabs;
};

const GlobalNoExperiments: React.FC<GlobalNoExperimentsProps> = ({ tab }) => {
  if (tab === ExperimentListTabs.ARCHIVED) {
    return (
      <EmptyState data-testid="global-no-experiments">
        <EmptyStateHeader
          titleText="No archived experiments"
          icon={<EmptyStateIcon icon={CubesIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>
          {'When you are finished with an experiment, you can archive it in the '}
          <b>Active</b>
          {' tab. You can view the archived experiment here.'}
        </EmptyStateBody>
      </EmptyState>
    );
  }

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
};
export default GlobalNoExperiments;
