import { Flex, FlexItem, Label } from '@patternfly/react-core';
import React from 'react';
import { TableText } from '@patternfly/react-table';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

import { RestoreRunsStatusIcon } from './RestoreRunsStatusIcon';
import { StatusEntry } from './types';

type RestoreRunsTableRowExperimentProps = {
  experimentStatus: StatusEntry<ExperimentKF>[];
  archivedExperiments: ExperimentKF[];
  currentExperiment: ExperimentKF;
  isSubmitting: boolean;
};

const RestoreRunsTableRowExperiment: React.FC<RestoreRunsTableRowExperimentProps> = ({
  experimentStatus,
  archivedExperiments,
  currentExperiment,
  isSubmitting,
}) => {
  const matchingExperiment = experimentStatus.find(
    (experiment) => experiment.item.experiment_id === currentExperiment.experiment_id,
  );

  const isExperimentArchived = !!archivedExperiments.find(
    (exp) => exp.experiment_id === currentExperiment.experiment_id,
  );
  return (
    <Flex gap={{ default: 'gapSm' }}>
      <FlexItem>
        <TableText>
          {isExperimentArchived && (
            <RestoreRunsStatusIcon
              status={matchingExperiment?.status}
              isSubmitting={isSubmitting}
            />
          )}{' '}
          {currentExperiment.display_name}
        </TableText>
      </FlexItem>

      {archivedExperiments.includes(currentExperiment) && (
        <FlexItem>
          <Label isCompact variant="outline" color="blue">
            Will be restored
          </Label>
        </FlexItem>
      )}
    </Flex>
  );
};

export default RestoreRunsTableRowExperiment;
