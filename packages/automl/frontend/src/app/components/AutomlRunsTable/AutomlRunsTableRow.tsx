import * as React from 'react';
import { Label, type LabelProps } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import RunStartTimestamp from '@odh-dashboard/internal/concepts/pipelines/content/tables/RunStartTimestamp';
import type { PipelineRun } from '~/app/types';
import { TASK_TYPE_LABELS } from '~/app/utilities/const';
import { automlResultsPathname } from '~/app/utilities/routes';
import { getTaskType } from '~/app/utilities/utils';
import { automlRunsColumns } from './columns';

/** Run state values (API / display). Use lowercase for case-insensitive matching. */
export const RUN_STATE = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RUNNING: 'running',
  PENDING: 'pending',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  PAUSED: 'paused',
  SKIPPED: 'skipped',
} as const;

type AutomlRunsTableRowProps = {
  run: PipelineRun;
  namespace: string;
};

export const getStatusLabelProps = (
  state: string | undefined,
): { status?: LabelProps['status']; color?: LabelProps['color'] } => {
  const s = (state ?? '').toLowerCase();
  if (s === RUN_STATE.SUCCEEDED || s === RUN_STATE.COMPLETE || s.includes(RUN_STATE.SUCCEEDED)) {
    return { status: 'success' };
  }
  if (s === RUN_STATE.FAILED || s.includes(RUN_STATE.FAILED)) {
    return { status: 'danger' };
  }
  if (s === RUN_STATE.RUNNING || s.includes(RUN_STATE.RUNNING)) {
    return { color: 'blue' };
  }
  if (s === RUN_STATE.PENDING || s.includes(RUN_STATE.PENDING)) {
    return { color: 'purple' };
  }
  if (s === RUN_STATE.SKIPPED || s.includes(RUN_STATE.SKIPPED)) {
    return { status: 'success' };
  }
  if (s === RUN_STATE.INCOMPLETE) {
    return { status: 'warning' };
  }
  return { color: 'grey' };
};

const AutomlRunsTableRow: React.FC<AutomlRunsTableRowProps> = ({ run, namespace }) => {
  const taskType = getTaskType(run);
  const predictionTypeLabel = taskType ? (TASK_TYPE_LABELS[taskType] ?? taskType) : '—';

  return (
    <Tr>
      <Td dataLabel={automlRunsColumns[0].label}>
        <Link
          to={`${automlResultsPathname}/${namespace}/${run.run_id}`}
          data-testid={`run-name-${run.run_id}`}
        >
          {run.display_name}
        </Link>
      </Td>
      <Td dataLabel={automlRunsColumns[1].label}>{run.description ?? '—'}</Td>
      <Td dataLabel={automlRunsColumns[2].label}>{predictionTypeLabel}</Td>
      <Td dataLabel={automlRunsColumns[3].label}>
        <RunStartTimestamp run={run} />
      </Td>
      <Td dataLabel={automlRunsColumns[4].label}>
        {run.state ? (
          <Label variant="outline" isCompact {...getStatusLabelProps(run.state)}>
            {run.state}
          </Label>
        ) : (
          '—'
        )}
      </Td>
    </Tr>
  );
};

export default AutomlRunsTableRow;
