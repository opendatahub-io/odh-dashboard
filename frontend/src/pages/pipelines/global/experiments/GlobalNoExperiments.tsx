import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
  Button,
} from '@patternfly/react-core';
import { CubesIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentListTabs } from './const';

type GlobalNoExperimentsProps = {
  tab: ExperimentListTabs;
};

const GlobalNoExperiments: React.FC<GlobalNoExperimentsProps> = ({ tab }) => {
  if (tab === ExperimentListTabs.ARCHIVED) {
    return (
      <EmptyState data-testid="global-no-archived-experiments">
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
    <EmptyState data-testid="global-no-active-experiments">
      <EmptyStateHeader
        titleText="No active experiments"
        icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>Click the button below to create a new active experiment.</EmptyStateBody>
      <EmptyStateFooter>
        <Button>Create experiment</Button>
      </EmptyStateFooter>
    </EmptyState>
  );
};
export default GlobalNoExperiments;
