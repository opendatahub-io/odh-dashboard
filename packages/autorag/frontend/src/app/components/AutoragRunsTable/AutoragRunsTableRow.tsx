import * as React from 'react';
import { Label, type LabelProps } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import RunStartTimestamp from '@odh-dashboard/internal/concepts/pipelines/content/tables/RunStartTimestamp';
import type { PipelineRun } from '~/app/types';
import DeleteRunModal from '~/app/components/run-results/DeleteRunModal';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import { autoragResultsPathname } from '~/app/utilities/routes';
import { isRunTerminatable, isRunRetryable, isRunDeletable } from '~/app/utilities/utils';
import { autoragRunsColumns } from './columns';

/** Run state values (API / display). Use lowercase for case-insensitive matching. */
export const RUN_STATE = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RUNNING: 'running',
  PENDING: 'pending',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
} as const;

type AutoragRunsTableRowProps = {
  run: PipelineRun;
  namespace: string;
  onActionComplete?: () => void | Promise<void>;
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
    return { color: 'blue' };
  }
  if (s === RUN_STATE.PENDING || s.includes(RUN_STATE.PENDING)) {
    return { color: 'purple' };
  }
  if (s === RUN_STATE.INCOMPLETE) {
    return { status: 'warning' };
  }
  return { color: 'grey' };
};

const AutoragRunsTableRow: React.FC<AutoragRunsTableRowProps> = ({
  run,
  namespace,
  onActionComplete,
}) => {
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const { handleRetry, handleConfirmStop, handleDelete, isRetrying, isTerminating, isDeleting } =
    useAutoragRunActions(namespace, run.run_id, onActionComplete);

  const runTerminatable = isRunTerminatable(run.state);
  const runRetryable = isRunRetryable(run.state);
  const runDeletable = isRunDeletable(run.state);

  const handleStop = React.useCallback(async () => {
    await handleConfirmStop();
    setIsStopModalOpen(false);
  }, [handleConfirmStop]);

  const handleConfirmDelete = React.useCallback(async () => {
    try {
      await handleDelete();
      setIsDeleteModalOpen(false);
    } catch {
      // Modal stays open; error toast is shown by handleDelete.
    }
  }, [handleDelete]);

  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    if (runTerminatable) {
      items.push({
        title: <span data-testid="stop-run-action">Stop</span>,
        onClick: () => setIsStopModalOpen(true),
      });
    }

    if (runRetryable) {
      items.push({
        title: <span data-testid="retry-run-action">Retry</span>,
        onClick: () => void handleRetry(),
        isDisabled: isRetrying,
      });
    }

    if (runDeletable) {
      if (runTerminatable || runRetryable) {
        items.push({ isSeparator: true });
      }
      items.push({
        title: <span data-testid="delete-run-action">Delete</span>,
        onClick: () => setIsDeleteModalOpen(true),
        isDisabled: isDeleting,
      });
    }

    return items;
  }, [runTerminatable, runRetryable, runDeletable, handleRetry, isRetrying, isDeleting]);

  return (
    <>
      <Tr>
        <Td dataLabel={autoragRunsColumns[0].label}>
          <Link
            to={`${autoragResultsPathname}/${namespace}/${run.run_id}`}
            data-testid={`run-name-${run.run_id}`}
          >
            {run.display_name}
          </Link>
        </Td>
        <Td dataLabel={autoragRunsColumns[1].label}>{run.description ?? '—'}</Td>
        <Td dataLabel={autoragRunsColumns[2].label}>
          <RunStartTimestamp run={run} />
        </Td>
        <Td dataLabel={autoragRunsColumns[3].label}>
          {run.state ? (
            <Label variant="outline" isCompact {...getStatusLabelProps(run.state)}>
              {run.state}
            </Label>
          ) : (
            '—'
          )}
        </Td>
        <Td isActionCell>{actions.length > 0 ? <ActionsColumn items={actions} /> : null}</Td>
      </Tr>
      <StopRunModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleStop}
        isTerminating={isTerminating}
        runName={run.display_name}
      />
      <DeleteRunModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        runName={run.display_name}
      />
    </>
  );
};

export default AutoragRunsTableRow;
