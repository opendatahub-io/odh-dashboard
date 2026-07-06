import React from 'react';
import { Link } from 'react-router-dom';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Truncate } from '@patternfly/react-core';
import { ExperimentKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '#~/components/table';
import { experimentArchivedRunsRoute, experimentRunsRoute } from '#~/routes/pipelines/experiments';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentCreated, LastExperimentRuns, LastExperimentRunsStarted } from './renderUtils';

type ExperimentTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  experiment: ExperimentKF;
  actionColumnItems: IAction[];
};

const ExperimentTableRow: React.FC<ExperimentTableRowProps> = ({
  isChecked,
  onToggleCheck,
  experiment,
  actionColumnItems,
}) => {
  const { namespace } = usePipelinesAPI();

  const isArchived = experiment.storage_state === StorageStateKF.ARCHIVED;

  return (
    <Tr>
      <CheckboxTd id={experiment.experiment_id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td dataLabel="Experiment">
        <TableRowTitleDescription
          title={
            <Link
              to={
                isArchived
                  ? experimentArchivedRunsRoute(namespace, experiment.experiment_id)
                  : experimentRunsRoute(namespace, experiment.experiment_id)
              }
              state={{ experiment }}
            >
              {/* TODO: Remove the inline style for underline once https://github.com/patternfly/patternfly/issues/7255 is resolved and PF versions are updated */}
              <Truncate style={{ textDecoration: 'underline' }} content={experiment.display_name} />
            </Link>
          }
          description={experiment.description}
          truncateDescriptionLines={2}
        />
      </Td>

      <Td dataLabel="Created">
        <ExperimentCreated experiment={experiment} />
      </Td>
      <Td dataLabel="Last run started">
        <LastExperimentRunsStarted experiment={experiment} />
      </Td>
      <Td dataLabel="Last 5 runs">
        <LastExperimentRuns experiment={experiment} />
      </Td>
      <Td isActionCell>
        <ActionsColumn items={actionColumnItems} />
      </Td>
    </Tr>
  );
};

export default ExperimentTableRow;
