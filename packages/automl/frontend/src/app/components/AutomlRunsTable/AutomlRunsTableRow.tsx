import * as React from 'react';
import { Label, Timestamp, TimestampTooltipVariant, type LabelProps } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { relativeTime } from 'mod-arch-shared';
import type { PipelineRun } from '~/app/types';
import { automlResultsPathname } from '~/app/utilities/routes';
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
    return { status: 'info' };
  }
  if (
    s === RUN_STATE.INCOMPLETE ||
    s === RUN_STATE.PENDING ||
    s === RUN_STATE.PAUSED ||
    s.includes(RUN_STATE.PENDING)
  ) {
    return { status: 'warning' };
  }
  return { color: 'grey' };
};

const AutomlRunsTableRow: React.FC<AutomlRunsTableRowProps> = ({ run, namespace }) => {
  const createdDate = run.created_at ? new Date(run.created_at) : null;
  const isValidDate = createdDate && !Number.isNaN(createdDate.getTime());

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
      <Td dataLabel={automlRunsColumns[2].label}>
        {isValidDate ? (
          <Timestamp
            date={createdDate}
            tooltip={{
              variant: TimestampTooltipVariant.default,
            }}
          >
            {relativeTime(Date.now(), createdDate.getTime())}
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
};

export default AutomlRunsTableRow;
