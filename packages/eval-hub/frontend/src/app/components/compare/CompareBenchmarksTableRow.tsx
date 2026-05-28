import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import {
  getSelectionKeysCheckedState,
  getVisibleRunsForJob,
} from '~/app/components/compare/compareBenchmarksTableUtils';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import { EvaluationJob } from '~/app/types';
import {
  buildBenchmarkSelectionKey,
  formatCompareTableDate,
  getBenchmarkDisplayTitle,
  getCompareParentEvaluationRunLabel,
  getCompareRunEvaluationLabel,
  getCompareRunType,
} from '~/app/utilities/compareEvaluationsUtils';

type CompareBenchmarksTableRowProps = {
  job: EvaluationJob;
  visibleRunKeys: Set<string> | null;
  collectionNameMap: CollectionNameMap;
  rowIndex: number;
  selectedBenchmarkKeys: Set<string>;
  onBenchmarkSelectionChange: (selectionKey: string, checked: boolean) => void;
  onRunBenchmarksSelectionChange: (selectionKeys: string[], checked: boolean) => void;
};

const CompareBenchmarksTableRow: React.FC<CompareBenchmarksTableRowProps> = ({
  job,
  visibleRunKeys,
  collectionNameMap,
  rowIndex,
  selectedBenchmarkKeys,
  onBenchmarkSelectionChange,
  onRunBenchmarksSelectionChange,
}) => {
  const comparableRuns = getVisibleRunsForJob(job, visibleRunKeys);
  const canExpand = comparableRuns.length > 0;
  const [isExpanded, setExpanded] = React.useState(canExpand);
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
      <Tr isContentExpanded={isExpanded} data-testid={`compare-run-row-${job.resource.id}`}>
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
            isChecked={rowCheckboxChecked}
            isDisabled={childSelectionKeys.length === 0}
            onChange={(_event, checked) =>
              onRunBenchmarksSelectionChange(childSelectionKeys, checked)
            }
            data-testid={`compare-run-checkbox-${job.resource.id}`}
          />
        </Td>
        <Td dataLabel="Evaluation run">{evaluationRunLabel}</Td>
        <Td dataLabel="Type">{getCompareRunType(job)}</Td>
        <Td dataLabel="Evaluation">{evaluationLabel}</Td>
        <Td dataLabel="Evaluated">{job.model.name}</Td>
        <Td dataLabel="Date">{formatCompareTableDate(job.resource.created_at)}</Td>
      </Tr>
      {canExpand
        ? comparableRuns.map((run) => {
            const selectionKey = buildBenchmarkSelectionKey({
              jobId: job.resource.id,
              benchmarkId: run.benchmarkId,
              benchmarkIndex: run.benchmarkIndex,
            });
            const benchmarkLabel = getBenchmarkDisplayTitle(run.benchmarkId);

            return (
              <Tr
                key={selectionKey}
                isExpanded={isExpanded}
                data-testid={`compare-benchmark-row-${selectionKey}`}
              >
                <Td />
                <Td dataLabel="Select benchmark">
                  <Checkbox
                    id={`compare-benchmark-checkbox-${selectionKey}`}
                    aria-label={`Select ${benchmarkLabel}`}
                    isChecked={selectedBenchmarkKeys.has(selectionKey)}
                    onChange={(_event, checked) =>
                      onBenchmarkSelectionChange(selectionKey, checked)
                    }
                    data-testid={`compare-benchmark-checkbox-${selectionKey}`}
                  />
                </Td>
                <Td dataLabel="Evaluation run">
                  {getCompareRunType(job) === 'Benchmark' ? evaluationRunLabel : benchmarkLabel}
                </Td>
                <Td />
                <Td />
                <Td />
                <Td />
              </Tr>
            );
          })
        : null}
    </Tbody>
  );
};

export default CompareBenchmarksTableRow;
