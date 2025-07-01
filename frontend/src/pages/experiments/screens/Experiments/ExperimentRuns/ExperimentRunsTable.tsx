import * as React from 'react';
import { Table, useCheckboxTableBase } from '#~/components/table';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { experimentRunsColumns } from './ExperimentRunsTableColumns';
import ExperimentRunsTableRow from './ExperimentRunsTableRow';

type ExperimentRunsTableProps = {
  experimentRuns: RegistryExperimentRun[];
  selectedRuns: RegistryExperimentRun[];
  setSelectedRuns: React.Dispatch<React.SetStateAction<RegistryExperimentRun[]>>;
};

const ExperimentRunsTable: React.FC<ExperimentRunsTableProps> = ({
  experimentRuns,
  selectedRuns,
  setSelectedRuns,
}) => {
  const { tableProps, toggleSelection, isSelected } = useCheckboxTableBase<RegistryExperimentRun>(
    experimentRuns,
    selectedRuns,
    setSelectedRuns,
    React.useCallback((run: RegistryExperimentRun) => run.id, []),
  );

  return (
    <Table
      data-testid="experiment-runs-table"
      data={experimentRuns}
      columns={experimentRunsColumns}
      defaultSortColumn={5} // Sort by started time by default
      enablePagination
      selectAll={tableProps.selectAll}
      rowRenderer={(experimentRun: RegistryExperimentRun) => (
        <ExperimentRunsTableRow
          key={experimentRun.id}
          experimentRun={experimentRun}
          isSelected={isSelected(experimentRun)}
          onSelectionChange={() => toggleSelection(experimentRun)}
        />
      )}
    />
  );
};

export default ExperimentRunsTable;
