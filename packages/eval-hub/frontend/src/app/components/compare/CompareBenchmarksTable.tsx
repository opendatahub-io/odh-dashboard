import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { Table, Th, Thead, Tr } from '@patternfly/react-table';
import CompareBenchmarksTableRow from '~/app/components/compare/CompareBenchmarksTableRow';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { EvaluationJob } from '~/app/types';
import {
  buildBenchmarkSelectionKey,
  filterComparableRunsForCompareBenchmarkSearch,
  getSelectionKeysCheckedState,
} from '~/app/utilities/compareEvaluationsUtils';

type CompareBenchmarksTableProps = {
  jobs: EvaluationJob[];
  collectionNameMap: CollectionNameMap;
  searchText: string;
  selectedBenchmarkKeys: Set<string>;
  onSelectionChange: (selectionKeys: string[], checked: boolean) => void;
};

const CompareBenchmarksTable: React.FC<CompareBenchmarksTableProps> = ({
  jobs,
  collectionNameMap,
  searchText,
  selectedBenchmarkKeys,
  onSelectionChange,
}) => {
  const visibleSelectionKeys = React.useMemo(
    () =>
      jobs.flatMap((job) =>
        filterComparableRunsForCompareBenchmarkSearch(job, searchText).map((run) =>
          buildBenchmarkSelectionKey({
            jobId: job.resource.id,
            benchmarkId: run.benchmarkId,
            benchmarkIndex: run.benchmarkIndex,
          }),
        ),
      ),
    [jobs, searchText],
  );

  const selectAllChecked = getSelectionKeysCheckedState(
    visibleSelectionKeys,
    selectedBenchmarkKeys,
  );

  return (
    <Table
      isExpandable
      variant="compact"
      borders
      aria-label="Choose benchmarks to compare"
      data-testid="choose-compare-benchmarks-table"
    >
      <Thead>
        <Tr>
          <Th screenReaderText="Row expansion" />
          <Th screenReaderText="Select benchmark">
            <Checkbox
              id="compare-select-all-benchmarks"
              aria-label="Select all benchmarks on current page"
              isChecked={selectAllChecked ?? false}
              isDisabled={visibleSelectionKeys.length === 0}
              onChange={(_event, checked) => onSelectionChange(visibleSelectionKeys, checked)}
              data-testid="compare-select-all-checkbox"
            />
          </Th>
          <Th modifier="nowrap" width={15}>
            Evaluation run
          </Th>
          <Th modifier="nowrap" width={10}>
            Type
          </Th>
          <Th modifier="nowrap" width={15}>
            Evaluation
          </Th>
          <Th modifier="nowrap" width={15}>
            Evaluated
          </Th>
          <Th modifier="nowrap" width={15}>
            Date
          </Th>
          <Th modifier="nowrap" width={10}>
            Result
          </Th>
        </Tr>
      </Thead>
      {jobs.map((job, rowIndex) => (
        <CompareBenchmarksTableRow
          key={job.resource.id}
          job={job}
          collectionNameMap={collectionNameMap}
          rowIndex={rowIndex}
          searchText={searchText}
          selectedBenchmarkKeys={selectedBenchmarkKeys}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </Table>
  );
};

export default CompareBenchmarksTable;
