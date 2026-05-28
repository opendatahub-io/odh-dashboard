import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { Table, Th, Thead, Tr } from '@patternfly/react-table';
import CompareBenchmarksTableRow from '~/app/components/compare/CompareBenchmarksTableRow';
import {
  getSelectionKeysCheckedState,
  getVisibleSelectionKeys,
} from '~/app/components/compare/compareBenchmarksTableUtils';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { CompareBenchmarkSearchMatch } from '~/app/utilities/compareEvaluationsUtils';

type CompareBenchmarksTableProps = {
  jobMatches: CompareBenchmarkSearchMatch[];
  collectionNameMap: CollectionNameMap;
  selectedBenchmarkKeys: Set<string>;
  onBenchmarkSelectionChange: (selectionKey: string, checked: boolean) => void;
  onRunBenchmarksSelectionChange: (selectionKeys: string[], checked: boolean) => void;
  onSelectAllChange: (selectionKeys: string[], checked: boolean) => void;
};

const CompareBenchmarksTable: React.FC<CompareBenchmarksTableProps> = ({
  jobMatches,
  collectionNameMap,
  selectedBenchmarkKeys,
  onBenchmarkSelectionChange,
  onRunBenchmarksSelectionChange,
  onSelectAllChange,
}) => {
  const visibleSelectionKeys = React.useMemo(
    () => getVisibleSelectionKeys(jobMatches),
    [jobMatches],
  );

  const selectAllChecked = getSelectionKeysCheckedState(
    visibleSelectionKeys,
    selectedBenchmarkKeys,
  );

  return (
    <Table
      isExpandable
      aria-label="Choose benchmarks to compare"
      data-testid="choose-compare-benchmarks-table"
    >
      <Thead>
        <Tr>
          <Th screenReaderText="Row expansion" />
          <Th screenReaderText="Select benchmark" width={10}>
            <Checkbox
              id="compare-select-all-benchmarks"
              aria-label="Select all benchmarks on current page"
              isChecked={selectAllChecked}
              isDisabled={visibleSelectionKeys.length === 0}
              onChange={(_event, checked) => onSelectAllChange(visibleSelectionKeys, checked)}
              data-testid="compare-select-all-checkbox"
            />
          </Th>
          <Th modifier="nowrap" width={20}>
            Evaluation run
          </Th>
          <Th modifier="nowrap" width={10}>
            Type
          </Th>
          <Th modifier="nowrap" width={25}>
            Evaluation
          </Th>
          <Th modifier="nowrap" width={25}>
            Evaluated
          </Th>
          <Th modifier="nowrap" width={10}>
            Date
          </Th>
        </Tr>
      </Thead>
      {jobMatches.map(({ job, visibleRunKeys }, rowIndex) => (
        <CompareBenchmarksTableRow
          key={job.resource.id}
          job={job}
          visibleRunKeys={visibleRunKeys}
          collectionNameMap={collectionNameMap}
          rowIndex={rowIndex}
          selectedBenchmarkKeys={selectedBenchmarkKeys}
          onBenchmarkSelectionChange={onBenchmarkSelectionChange}
          onRunBenchmarksSelectionChange={onRunBenchmarksSelectionChange}
        />
      ))}
    </Table>
  );
};

export default CompareBenchmarksTable;
