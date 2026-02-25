import * as React from 'react';
import { Button, Flex, FlexItem, Label, type LabelProps } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import type { PipelineRun } from '~/app/types';
import { autoragRunsColumns } from './columns';

type AutoragRunsTableRowProps = {
  run: PipelineRun;
  onNameClick: (run: PipelineRun) => void;
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

const AutoragRunsTableRow: React.FC<AutoragRunsTableRowProps> = ({ run, onNameClick }) => (
  <Tr>
    <Td dataLabel={autoragRunsColumns[0].label}>
      <Button
        variant="link"
        isInline
        onClick={() => onNameClick(run)}
        data-testid={`run-name-${run.id}`}
      >
        {run.name}
      </Button>
    </Td>
    <Td dataLabel={autoragRunsColumns[1].label}>{run.description ?? '—'}</Td>
    <Td dataLabel={autoragRunsColumns[2].label}>
      {run.tags?.length ? (
        <Flex gap={{ default: 'gapSm' }} wrap="wrap">
          {run.tags.map((tag) => (
            <FlexItem key={tag}>
              <Label color="grey" isCompact>
                {tag}
              </Label>
            </FlexItem>
          ))}
        </Flex>
      ) : (
        '—'
      )}
    </Td>
    <Td dataLabel={autoragRunsColumns[3].label}>
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
