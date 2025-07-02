import React from 'react';
import { Table, Thead, Tr, Th, Tbody } from '@patternfly/react-table';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { ColumnConfig } from './ExperimentRunsTableColumnsConfig';
import ExperimentRunsTableRow from './ExperimentRunsTableRow';
import {
  NestedExperimentRun,
  organizeRunsHierarchy,
  flattenRunsForDisplay,
} from './experimentRunsUtils';

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
  const [expandedRunIds, setExpandedRunIds] = React.useState<Set<string>>(new Set());

  // Organize runs into hierarchy
  const hierarchy = React.useMemo(() => organizeRunsHierarchy(experimentRuns), [experimentRuns]);

  // Flatten runs for display, respecting expanded state
  const displayRuns = React.useMemo(
    () => flattenRunsForDisplay(hierarchy.topLevelRuns, expandedRunIds),
    [hierarchy.topLevelRuns, expandedRunIds],
  );

  // Handle expand/collapse
  const handleToggleExpand = React.useCallback((runId: string) => {
    setExpandedRunIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  }, []);

  // Helper to check if a run is selected by ID
  const isRunSelected = React.useCallback(
    (run: NestedExperimentRun) => selectedRuns.some((selectedRun) => selectedRun.id === run.id),
    [selectedRuns],
  );

  // Helper to convert NestedExperimentRun to RegistryExperimentRun
  const convertToBaseRun = (run: NestedExperimentRun): RegistryExperimentRun => ({
    id: run.id,
    name: run.name,
    externalID: run.externalID,
    description: run.description,
    createTimeSinceEpoch: run.createTimeSinceEpoch,
    lastUpdateTimeSinceEpoch: run.lastUpdateTimeSinceEpoch,
    customProperties: run.customProperties,
    experimentId: run.experimentId,
    state: run.state,
    status: run.status,
    startTimeSinceEpoch: run.startTimeSinceEpoch,
    endTimeSinceEpoch: run.endTimeSinceEpoch,
    owner: run.owner,
  });

  // Helper to toggle selection
  const toggleRunSelection = React.useCallback(
    (run: NestedExperimentRun) => {
      if (isRunSelected(run)) {
        setSelectedRuns((prev) => prev.filter((selectedRun) => selectedRun.id !== run.id));
      } else {
        const baseRun = convertToBaseRun(run);
        setSelectedRuns((prev) => [...prev, baseRun]);
      }
    },
    [isRunSelected, setSelectedRuns],
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
    firstRowHeaders.push(
      <Th key={kebabColumn.field || 'kebab'} rowSpan={2}>
        {kebabColumn.label}
      </Th>,
    );

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
        {displayRuns.map((experimentRun) => (
          <ExperimentRunsTableRow
            key={experimentRun.id}
            experimentRun={experimentRun}
            isSelected={isRunSelected(experimentRun)}
            onSelectionChange={() => toggleRunSelection(experimentRun)}
            selectedColumns={selectedColumns}
            isExpanded={expandedRunIds.has(experimentRun.id)}
            onToggleExpand={() => handleToggleExpand(experimentRun.id)}
          />
        ))}
      </Tbody>
    </Table>
  );
};

export default ExperimentRunsTableWithNestedHeaders;
