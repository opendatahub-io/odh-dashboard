import * as React from 'react';
import { Label, type LabelProps } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import RunStartTimestamp from '@odh-dashboard/internal/concepts/pipelines/content/tables/RunStartTimestamp';
import type { PipelineRun } from '~/app/types';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { useAutomlRunActions } from '~/app/hooks/useAutomlRunActions';
import { TASK_TYPE_LABELS } from '~/app/utilities/const';
import { automlReconfigurePathname, automlResultsPathname } from '~/app/utilities/routes';
import { getTaskType, isRunTerminatable, isRunRetryable } from '~/app/utilities/utils';
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
  onActionComplete?: () => void | Promise<void>;
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

const AutomlRunsTableRow: React.FC<AutomlRunsTableRowProps> = ({
  run,
  namespace,
  onActionComplete,
}) => {
  const taskType = getTaskType(run);
  const predictionTypeLabel = taskType ? (TASK_TYPE_LABELS[taskType] ?? taskType) : '—';
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutomlRunActions(
    namespace,
    run.run_id,
    onActionComplete,
  );

  const runTerminatable = isRunTerminatable(run.state);
  const runRetryable = isRunRetryable(run.state);

  const handleStop = React.useCallback(async () => {
    try {
      await handleConfirmStop();
      setIsStopModalOpen(false);
    } catch {
      // Keep modal open on failure; error notification is shown by the hook.
    }
  }, [handleConfirmStop]);

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
        onClick: () => void handleRetry().catch(() => undefined),
        isDisabled: isRetrying,
      });
    }

    items.push({
      title: <span data-testid="reconfigure-run-action">Reconfigure</span>,
      component: Link,
      to: `${automlReconfigurePathname}/${namespace}/${run.run_id}`,
    });

    return items;
  }, [runTerminatable, runRetryable, handleRetry, isRetrying, namespace, run.run_id]);

  return (
    <>
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
        <Td isActionCell>{actions.length > 0 ? <ActionsColumn items={actions} /> : null}</Td>
      </Tr>
      <StopRunModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleStop}
        isTerminating={isTerminating}
        runName={run.display_name}
      />
    </>
  );
};

export default AutomlRunsTableRow;
