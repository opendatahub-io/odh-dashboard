import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, Label, Checkbox } from '@patternfly/react-core';
import * as React from 'react';
import {
  RegistryExperimentRun,
  ExperimentRunStatus,
  ExperimentRunState,
} from '#~/concepts/modelRegistry/types';

type ExperimentRunsTableRowProps = {
  experimentRun: RegistryExperimentRun;
  isSelected: boolean;
  onSelectionChange: () => void;
};

const getStatusColor = (
  status?: ExperimentRunStatus,
): 'grey' | 'green' | 'blue' | 'red' | 'orange' => {
  switch (status) {
    case ExperimentRunStatus.FINISHED:
      return 'green';
    case ExperimentRunStatus.RUNNING:
      return 'blue';
    case ExperimentRunStatus.FAILED:
      return 'red';
    case ExperimentRunStatus.KILLED:
      return 'red';
    case ExperimentRunStatus.SCHEDULED:
      return 'orange';
    default:
      return 'grey';
  }
};

const getStateColor = (state?: ExperimentRunState): 'grey' | 'green' | 'red' => {
  switch (state) {
    case ExperimentRunState.LIVE:
      return 'green';
    case ExperimentRunState.ARCHIVED:
      return 'red';
    default:
      return 'grey';
  }
};

const ExperimentRunsTableRow: React.FC<ExperimentRunsTableRowProps> = ({
  experimentRun,
  isSelected,
  onSelectionChange,
}) => (
  <Tr>
    <Td dataLabel="Select">
      <Checkbox
        id={`select-${experimentRun.id}`}
        isChecked={isSelected}
        onChange={onSelectionChange}
        aria-label={`Select experiment run ${experimentRun.name}`}
      />
    </Td>
    <Td dataLabel="Run name">
      <div>
        <strong>{experimentRun.name || 'Unnamed'}</strong>
      </div>
    </Td>
    <Td dataLabel="Owner">
      <div>{experimentRun.owner || '-'}</div>
    </Td>
    <Td dataLabel="Status">
      <Label color={getStatusColor(experimentRun.status)}>
        {experimentRun.status || 'UNKNOWN'}
      </Label>
    </Td>
    <Td dataLabel="State">
      <Label color={getStateColor(experimentRun.state)}>{experimentRun.state || 'LIVE'}</Label>
    </Td>
    <Td dataLabel="Started">
      {experimentRun.startTimeSinceEpoch ? (
        <Timestamp date={new Date(parseInt(experimentRun.startTimeSinceEpoch, 10))} />
      ) : (
        '-'
      )}
    </Td>
    <Td dataLabel="Ended">
      {experimentRun.endTimeSinceEpoch ? (
        <Timestamp date={new Date(parseInt(experimentRun.endTimeSinceEpoch, 10))} />
      ) : (
        '-'
      )}
    </Td>
    <Td dataLabel="Kebab" isActionCell>
      {/* TODO: Add kebab menu actions */}
    </Td>
  </Tr>
);

export default ExperimentRunsTableRow;
