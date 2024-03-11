import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd } from '~/components/table';
import { ExperimentCreated, LastExperimentRuns } from './renderUtils';

type ExperimentTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  experiment: ExperimentKFv2;
  actionColumnItems: IAction[];
};

const ExperimentTableRow: React.FC<ExperimentTableRowProps> = ({
  isChecked,
  onToggleCheck,
  experiment,
  actionColumnItems,
}) => (
  <Tr>
    <CheckboxTd id={experiment.experiment_id} isChecked={isChecked} onToggle={onToggleCheck} />
    <Td dataLabel="Experiment">{experiment.display_name}</Td>
    <Td dataLabel="Description">{experiment.description}</Td>
    <Td dataLabel="Created">
      <ExperimentCreated experiment={experiment} />
    </Td>
    <Td dataLabel="Last 5 runs">
      <LastExperimentRuns experiment={experiment} />
    </Td>
    <Td isActionCell dataLabel="Kebab">
      <ActionsColumn items={actionColumnItems} />
    </Td>
  </Tr>
);

export default ExperimentTableRow;
