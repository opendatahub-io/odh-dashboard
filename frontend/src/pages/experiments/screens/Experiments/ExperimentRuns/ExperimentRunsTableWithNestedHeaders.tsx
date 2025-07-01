import React from 'react';
import { Table, Thead, Tr, Th, Tbody } from '@patternfly/react-table';
import { useCheckboxTableBase } from '#~/components/table';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { ColumnConfig } from './ExperimentRunsTableColumnsConfig';
import ExperimentRunsTableRow from './ExperimentRunsTableRow';

type ExperimentRunsTableWithNestedHeadersProps = {
  experimentRuns: RegistryExperimentRun[];
  selectedRuns: RegistryExperimentRun[];
  setSelectedRuns: React.Dispatch<React.SetStateAction<RegistryExperimentRun[]>>;
  columnConfig: ColumnConfig;
  selectedColumns: {
    metrics: Array<{ id: string; name: string; checked: boolean }>;
    parameters: Array<{ id: string; name: string; checked: boolean }>;
    tags: Array<{ id: string; name: string; checked: boolean }>;
  };
};

const ExperimentRunsTableWithNestedHeaders: React.FC<ExperimentRunsTableWithNestedHeadersProps> = ({
  experimentRuns,
  selectedRuns,
  setSelectedRuns,
  columnConfig,
  selectedColumns,
}) => {
  const { tableProps, toggleSelection, isSelected } = useCheckboxTableBase<RegistryExperimentRun>(
    experimentRuns,
    selectedRuns,
    setSelectedRuns,
    React.useCallback((run: RegistryExperimentRun) => run.id, []),
  );

  const { baseColumns, dynamicColumns, nestedHeaderConfig } = columnConfig;
  const allColumns = [...baseColumns, ...dynamicColumns];

  const renderNestedHeaders = () => {
    if (!nestedHeaderConfig.hasNested) {
      // Regular single header row
      return (
        <Tr>
          {allColumns.map((column, index) => (
            <Th key={column.field || index}>{column.label}</Th>
          ))}
        </Tr>
      );
    }

    // Nested headers
    const firstRowHeaders: React.ReactNode[] = [];
    const secondRowHeaders: React.ReactNode[] = [];

    // Add base columns to first row (they span both rows)
    baseColumns.slice(0, -1).forEach((column, index) => {
      firstRowHeaders.push(
        <Th key={column.field || index} rowSpan={2}>
          {column.label}
        </Th>,
      );
    });

    // Add group headers to first row
    nestedHeaderConfig.groups.forEach((group, index) => {
      firstRowHeaders.push(
        <Th key={`group-${index}`} colSpan={group.colSpan} hasRightBorder>
          {group.label}
        </Th>,
      );
    });

    // Add kebab column to first row
    const kebabColumn = baseColumns[baseColumns.length - 1];
    if (kebabColumn) {
      firstRowHeaders.push(
        <Th key={kebabColumn.field || 'kebab'} rowSpan={2}>
          {kebabColumn.label}
        </Th>,
      );
    }

    // Add individual column headers to second row
    nestedHeaderConfig.groups.forEach((group) => {
      group.fields.forEach((field) => {
        const column = dynamicColumns.find((col) => col.field === field);
        if (column) {
          secondRowHeaders.push(
            <Th key={field} isSubheader>
              {column.label}
            </Th>,
          );
        }
      });
    });

    return (
      <>
        <Tr>{firstRowHeaders}</Tr>
        <Tr>{secondRowHeaders}</Tr>
      </>
    );
  };

  return (
    <Table aria-label="Experiment runs table with nested headers" gridBreakPoint="">
      <Thead hasNestedHeader={nestedHeaderConfig.hasNested}>{renderNestedHeaders()}</Thead>
      <Tbody>
        {experimentRuns.map((experimentRun) => (
          <ExperimentRunsTableRow
            key={experimentRun.id}
            experimentRun={experimentRun}
            isSelected={isSelected(experimentRun)}
            onSelectionChange={() => toggleSelection(experimentRun)}
            selectedColumns={selectedColumns}
          />
        ))}
      </Tbody>
    </Table>
  );
};

export default ExperimentRunsTableWithNestedHeaders;
