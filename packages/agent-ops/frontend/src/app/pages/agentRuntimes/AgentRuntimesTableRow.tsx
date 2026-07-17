import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Label, MenuToggle, Truncate } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { TableRowTitleDescription } from '@odh-dashboard/internal/components/table';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import AgentDeleteModal from '~/app/components/AgentDeleteModal';
import RestartAgentModal from '~/app/components/RestartAgentModal';
import StopAgentModal from '~/app/components/StopAgentModal';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import { useAgentLifecycleActions } from '~/app/hooks/useAgentLifecycleActions';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { agentOpsDeploymentDetailRoute } from '~/app/utilities/routes';
import { agentRuntimesColumns } from './columns';

type AgentRuntimesTableRowProps = {
  runtime: AgentRuntime;
  onRefresh: () => Promise<void>;
  deployMode?: boolean;
};

const AgentRuntimesTableRow: React.FC<AgentRuntimesTableRowProps> = ({
  runtime,
  onRefresh,
  deployMode = false,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const [isRestartModalOpen, setIsRestartModalOpen] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const detailRoute = agentOpsDeploymentDetailRoute(runtime.namespace, runtime.name);

  const {
    visibility,
    isPending,
    isDeleting,
    handleStart,
    handleRestart,
    handleStop,
    handleDelete,
  } = useAgentLifecycleActions({ runtime, onRefresh });

  const actionsToggleAriaLabel = React.useMemo(
    () => `Actions for ${runtime.name} in ${runtime.namespace}`,
    [runtime.name, runtime.namespace],
  );

  const actions: IAction[] = React.useMemo(() => {
    const nextActions: IAction[] = [];

    if (deployMode) {
      nextActions.push({
        title: 'View details',
        component: (props) => <Link {...props} to={detailRoute} />,
      });
    }

    if (visibility.showStart) {
      nextActions.push({
        title: 'Start',
        isDisabled: isPending,
        onClick: () => {
          void handleStart();
        },
      });
    }

    if (visibility.showRestart) {
      nextActions.push({
        title: 'Restart',
        isDisabled: isPending,
        onClick: () => setIsRestartModalOpen(true),
      });
    }

    if (visibility.showStop) {
      nextActions.push({
        title: 'Stop',
        isDisabled: isPending,
        onClick: () => setIsStopModalOpen(true),
      });
    }

    if (deployMode && visibility.showDelete) {
      nextActions.push({
        title: 'Delete',
        isDisabled: isPending,
        onClick: () => setIsDeleteModalOpen(true),
      });
    }

    return nextActions;
  }, [
    deployMode,
    detailRoute,
    handleStart,
    isPending,
    visibility.showDelete,
    visibility.showRestart,
    visibility.showStart,
    visibility.showStop,
  ]);

  return (
    <>
      <Tr data-testid={`agent-runtime-row-${runtime.namespace}-${runtime.name}`}>
        <Td dataLabel={agentRuntimesColumns[0].label} data-testid="agent-runtime-name">
          <TableRowTitleDescription
            title={
              <ResourceNameTooltip
                resource={{
                  metadata: { name: runtime.name },
                  apiVersion: 'agents.x-k8s.io/v1beta1',
                  kind: 'Sandbox',
                }}
              >
                {deployMode ? (
                  <Link to={detailRoute}>{runtime.displayName || runtime.name}</Link>
                ) : (
                  <Truncate content={runtime.displayName || runtime.name} />
                )}
              </ResourceNameTooltip>
            }
            description={runtime.description}
            truncateDescriptionLines={2}
          />
        </Td>
        <Td dataLabel={agentRuntimesColumns[1].label} data-testid="agent-runtime-framework">
          {runtime.framework || '-'}
        </Td>
        <Td dataLabel={agentRuntimesColumns[2].label} data-testid="agent-runtime-sandbox">
          {runtime.workloadType === 'sandbox' ? (
            <Label isCompact color="green">
              Sandboxed
            </Label>
          ) : (
            '-'
          )}
        </Td>
        <Td dataLabel={agentRuntimesColumns[3].label} data-testid="agent-runtime-status">
          <AgentRuntimeStatusLabel status={runtime.status} statusMessage={runtime.statusMessage} />
        </Td>
        <Td isActionCell data-testid="agent-runtime-actions">
          {actions.length > 0 ? (
            <ActionsColumn
              items={actions}
              actionsToggle={({ toggleRef, onToggle, isOpen, isDisabled }) => (
                <MenuToggle
                  aria-label={actionsToggleAriaLabel}
                  ref={toggleRef}
                  onClick={(event) => onToggle(event)}
                  isExpanded={isOpen}
                  isDisabled={isDisabled}
                  variant="plain"
                  icon={<EllipsisVIcon />}
                />
              )}
            />
          ) : null}
        </Td>
      </Tr>
      {isStopModalOpen && (
        <StopAgentModal
          agentName={runtime.name}
          isStopping={isPending}
          onConfirm={() => {
            void handleStop()
              .then(() => setIsStopModalOpen(false))
              .catch(() => undefined);
          }}
          onCancel={() => setIsStopModalOpen(false)}
        />
      )}
      {isRestartModalOpen && (
        <RestartAgentModal
          agentName={runtime.name}
          isRestarting={isPending}
          onConfirm={() => {
            void handleRestart()
              .then(() => setIsRestartModalOpen(false))
              .catch(() => undefined);
          }}
          onCancel={() => setIsRestartModalOpen(false)}
        />
      )}
      {isDeleteModalOpen && (
        <AgentDeleteModal
          agentName={runtime.name}
          isDeleting={isDeleting || isConfirmingDelete}
          onConfirm={() => {
            if (isConfirmingDelete) {
              return;
            }

            setIsConfirmingDelete(true);
            void handleDelete()
              .then(() => setIsDeleteModalOpen(false))
              .catch(() => undefined)
              .finally(() => setIsConfirmingDelete(false));
          }}
          onCancel={() => {
            if (!isDeleting && !isConfirmingDelete) {
              setIsDeleteModalOpen(false);
            }
          }}
        />
      )}
    </>
  );
};

export default AgentRuntimesTableRow;
