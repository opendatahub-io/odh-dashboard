import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { EvaluationJob } from '~/app/types';
import { getBenchmarkDisplayName } from '~/app/utilities/evaluationUtils';
import {
  COMPARE_CHILD_RUN_TYPE,
  buildBenchmarkSelectionKey,
  filterComparableRunsForCompareBenchmarkSearch,
  formatCompareTableDate,
  getCompareBenchmarkResultScore,
  getCompareParentEvaluationRunLabel,
  getCompareParentResultScore,
  getCompareRunEvaluationLabel,
  getCompareRunType,
  getSelectionKeysCheckedState,
} from '~/app/utilities/compareEvaluationsUtils';

const childRowStyle: React.CSSProperties = {
  borderBlockEnd:
    'var(--pf-v6-c-table--border-width--base) solid var(--pf-t--global--border--color--default)',
  background: 'transparent',
};

type CompareBenchmarksTableRowProps = {
  job: EvaluationJob;
  collectionNameMap: CollectionNameMap;
  rowIndex: number;
  searchText: string;
  selectedBenchmarkKeys: Set<string>;
  onSelectionChange: (selectionKeys: string[], checked: boolean) => void;
};

const CompareBenchmarksTableRow: React.FC<CompareBenchmarksTableRowProps> = ({
  job,
  collectionNameMap,
  rowIndex,
  searchText,
  selectedBenchmarkKeys,
  onSelectionChange,
}) => {
  const comparableRuns = React.useMemo(
    () => filterComparableRunsForCompareBenchmarkSearch(job, searchText),
    [job, searchText],
  );
  const canExpand = comparableRuns.length > 0;
  const [isExpanded, setExpanded] = React.useState(canExpand);

  React.useEffect(() => {
    if (searchText.trim()) {
      setExpanded(canExpand);
    }
  }, [canExpand, searchText]);
  const evaluationLabel = getCompareRunEvaluationLabel(job, collectionNameMap);
  const evaluationRunLabel = getCompareParentEvaluationRunLabel(job);

  const childSelectionKeys = comparableRuns.map((run) =>
    buildBenchmarkSelectionKey({
      jobId: job.resource.id,
      benchmarkId: run.benchmarkId,
      benchmarkIndex: run.benchmarkIndex,
    }),
  );

  const rowCheckboxChecked = getSelectionKeysCheckedState(
    childSelectionKeys,
    selectedBenchmarkKeys,
  );

  return (
    <Tbody isExpanded={isExpanded} data-testid={`compare-run-group-${job.resource.id}`}>
      <Tr
        isContentExpanded={isExpanded}
        isControlRow
        style={
          isExpanded
            ? {
                borderBlockEnd:
                  'var(--pf-v6-c-table--border-width--base) solid var(--pf-t--global--border--color--default)',
              }
            : undefined
        }
        data-testid={`compare-run-row-${job.resource.id}`}
      >
        {canExpand ? (
          <Td
            expand={{
              rowIndex,
              expandId: 'compare-run-item',
              isExpanded,
              onToggle: () => setExpanded(!isExpanded),
            }}
            data-testid={`compare-run-expand-${job.resource.id}`}
          />
        ) : (
          <Td />
        )}
        <Td dataLabel="Select benchmark">
          <Checkbox
            id={`compare-run-checkbox-${job.resource.id}`}
            aria-label={`Select benchmarks for ${evaluationRunLabel}`}
            isChecked={rowCheckboxChecked ?? false}
            isDisabled={childSelectionKeys.length === 0}
            onChange={(_event, checked) => onSelectionChange(childSelectionKeys, checked)}
            data-testid={`compare-run-checkbox-${job.resource.id}`}
          />
        </Td>
        <Td dataLabel="Evaluation run">{evaluationRunLabel}</Td>
        <Td modifier="nowrap" dataLabel="Type">
          {getCompareRunType(job)}
        </Td>
        <Td dataLabel="Evaluation">{evaluationLabel}</Td>
        <Td dataLabel="Evaluated">{job.model.name}</Td>
        <Td modifier="nowrap" dataLabel="Date">
          {formatCompareTableDate(job.resource.created_at)}
        </Td>
        <Td dataLabel="Result">{getCompareParentResultScore(job)}</Td>
      </Tr>
      {canExpand
        ? comparableRuns.map((run) => {
            const selectionKey = buildBenchmarkSelectionKey({
              jobId: job.resource.id,
              benchmarkId: run.benchmarkId,
              benchmarkIndex: run.benchmarkIndex,
            });
            const benchmarkLabel = getBenchmarkDisplayName(run.benchmarkId);

            return (
              <Tr
                key={selectionKey}
                isExpanded={isExpanded}
                style={childRowStyle}
                data-testid={`compare-benchmark-row-${selectionKey}`}
              >
                <Td />
                <Td dataLabel="Select benchmark">
                  <Checkbox
                    id={`compare-benchmark-checkbox-${selectionKey}`}
                    aria-label={`Select ${benchmarkLabel} for ${evaluationRunLabel}`}
                    isChecked={selectedBenchmarkKeys.has(selectionKey)}
                    onChange={(_event, checked) => onSelectionChange([selectionKey], checked)}
                    data-testid={`compare-benchmark-checkbox-${selectionKey}`}
                  />
                </Td>
                <Td modifier="nowrap" dataLabel="Evaluation run">
                  <span className="pf-v6-u-pl-lg">{benchmarkLabel}</span>
                </Td>
                <Td modifier="nowrap" dataLabel="Type">
                  {COMPARE_CHILD_RUN_TYPE}
                </Td>
                <Td modifier="nowrap" dataLabel="Evaluation">
                  {getBenchmarkDisplayName(run.benchmarkId)}
                </Td>
                <Td modifier="nowrap" dataLabel="Evaluated">
                  {job.model.name}
                </Td>
                <Td modifier="nowrap" dataLabel="Date">
                  {formatCompareTableDate(job.resource.created_at)}
                </Td>
                <Td modifier="nowrap" dataLabel="Result">
                  {getCompareBenchmarkResultScore(job, run.benchmarkId, run.benchmarkIndex)}
                </Td>
              </Tr>
            );
          })
        : null}
    </Tbody>
  );
};

export default CompareBenchmarksTableRow;
