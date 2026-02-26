import * as React from 'react';
import { Label, type LabelProps } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import type { PipelineRun } from '~/app/types';
import { autoragRunsColumns } from './columns';

type AutoragRunsTableRowProps = {
  run: PipelineRun;
};

const getStatusLabelProps = (
  status: string | undefined,
): { status?: LabelProps['status']; color?: LabelProps['color'] } => {
  const s = (status ?? '').toLowerCase();
  if (s === 'succeeded' || s === 'complete') {
    return { status: 'success' };
  }
  if (s === 'failed') {
    return { status: 'danger' };
  }
  if (s === 'running') {
    return { status: 'info' };
  }
  if (s === 'incomplete' || s === 'pending') {
    return { status: 'warning' };
  }
  return { color: 'grey' };
};

const AutoragRunsTableRow: React.FC<AutoragRunsTableRowProps> = ({ run }) => (
  <Tr>
    <Td dataLabel={autoragRunsColumns[0].label}>
      <span data-testid={`run-name-${run.id}`}>{run.name}</span>
    </Td>
    <Td dataLabel={autoragRunsColumns[1].label}>{run.description ?? '—'}</Td>
    <Td dataLabel={autoragRunsColumns[2].label}>
      {run.status ? (
        <Label isCompact {...getStatusLabelProps(run.status)}>
          {run.status}
        </Label>
      ) : (
        '—'
      )}
    </Td>
  </Tr>
);

export default AutoragRunsTableRow;
