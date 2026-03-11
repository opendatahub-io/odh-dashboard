import * as React from 'react';
import { Label, Timestamp, TimestampTooltipVariant, type LabelProps } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { relativeTime } from 'mod-arch-shared';
import type { PipelineRun } from '~/app/types';
import { automlRunsColumns } from './columns';

/** Run state values (API / display). Use lowercase for case-insensitive matching. */
export const RUN_STATE = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RUNNING: 'running',
  PENDING: 'pending',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
} as const;

type AutomlRunsTableRowProps = {
  run: PipelineRun;
};

const getStatusLabelProps = (
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
    return { status: 'info' };
  }
  if (s === RUN_STATE.INCOMPLETE || s === RUN_STATE.PENDING || s.includes(RUN_STATE.PENDING)) {
    return { status: 'warning' };
  }
  return { color: 'grey' };
};

const AutomlRunsTableRow: React.FC<AutomlRunsTableRowProps> = ({ run }) => (
  <Tr>
    <Td dataLabel={automlRunsColumns[0].label}>
      <span data-testid={`run-name-${run.run_id}`}>{run.display_name}</span>
    </Td>
    <Td dataLabel={automlRunsColumns[1].label}>{run.description ?? '—'}</Td>
    <Td dataLabel={automlRunsColumns[2].label}>
      {run.created_at ? (
        <Timestamp
          date={new Date(run.created_at)}
          tooltip={{
            variant: TimestampTooltipVariant.default,
          }}
        >
          {relativeTime(Date.now(), new Date(run.created_at).getTime())}
        </Timestamp>
      ) : (
        '—'
      )}
    </Td>
    <Td dataLabel={automlRunsColumns[3].label}>
      {run.state ? (
        <Label isCompact {...getStatusLabelProps(run.state)}>
          {run.state}
        </Label>
      ) : (
        '—'
      )}
    </Td>
  </Tr>
);

export default AutomlRunsTableRow;
