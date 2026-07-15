import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Button, MenuToggle, Truncate } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import AgentDeleteModal from '~/app/components/AgentDeleteModal';
import AgentRuntimeEndpointsModal from '~/app/components/AgentRuntimeEndpointsModal';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import { useAgentLifecycleActions } from '~/app/hooks/useAgentLifecycleActions';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import { getAgentRuntimeEndpointFields } from '~/app/utilities/agentRuntimeEndpoints';
import { agentOpsDeploymentDetailRoute } from '~/app/utilities/routes';
import { agentRuntimesColumns } from './columns';

type AgentRuntimesTableRowProps = {
  runtime: AgentRuntime;
  onRefresh: () => Promise<void>;
  discoveryMode?: boolean;
};

const AgentRuntimesTableRow: React.FC<AgentRuntimesTableRowProps> = ({
  runtime,
  onRefresh,
  discoveryMode = false,
}) => {
  const [isEndpointsModalOpen, setIsEndpointsModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const detailRoute = agentOpsDeploymentDetailRoute(runtime.namespace, runtime.name);

  const { visibility, isPending, isDeleting, handleRestart, handleStop, handleDelete } =
    useAgentLifecycleActions({ runtime, onRefresh });

  const hasEndpoints = React.useMemo(
    () => getAgentRuntimeEndpointFields(runtime).length > 0,
    [runtime],
  );

  const actionsToggleAriaLabel = React.useMemo(
    () => `Actions for ${runtime.name} in ${runtime.namespace}`,
    [runtime.name, runtime.namespace],
  );

  const actions: IAction[] = React.useMemo(() => {
    if (discoveryMode) {
      return [];
    }

    const nextActions: IAction[] = [
      {
        title: 'View details',
        component: (props) => <Link {...props} to={detailRoute} />,
      },
    ];

    if (visibility.showRestart) {
      nextActions.push({
        title: 'Restart',
        isDisabled: isPending,
        onClick: () => {
          void handleRestart();
        },
      });
    }

    if (visibility.showStop) {
      nextActions.push({
        title: 'Stop',
        isDisabled: isPending,
        onClick: () => {
          void handleStop();
        },
      });
    }

    if (visibility.showDelete) {
      nextActions.push({
        title: 'Delete',
        isDisabled: isPending,
        onClick: () => setIsDeleteModalOpen(true),
      });
    }

    return nextActions;
  }, [
    discoveryMode,
    detailRoute,
    handleRestart,
    handleStop,
    isPending,
    visibility.showDelete,
    visibility.showRestart,
    visibility.showStop,
  ]);

  return (
    <>
      <Tr data-testid={`agent-runtime-row-${runtime.namespace}-${runtime.name}`}>
        <Td dataLabel={agentRuntimesColumns[0].label} data-testid="agent-runtime-name">
          {discoveryMode ? (
            <Truncate content={runtime.name} />
          ) : (
            <Link to={detailRoute}>
              <Truncate content={runtime.name} />
            </Link>
          )}
        </Td>
        <Td dataLabel={agentRuntimesColumns[1].label} data-testid="agent-runtime-namespace">
          {runtime.namespace}
        </Td>
        <Td dataLabel={agentRuntimesColumns[2].label} data-testid="agent-runtime-endpoint">
          <Button
            variant="link"
            isInline
            isDisabled={!hasEndpoints}
            onClick={() => setIsEndpointsModalOpen(true)}
            data-testid="agent-runtime-endpoint-view"
          >
            View
          </Button>
        </Td>
        <Td dataLabel={agentRuntimesColumns[3].label} data-testid="agent-runtime-status">
          <AgentRuntimeStatusLabel status={runtime.status} />
        </Td>
        {!discoveryMode && (
          <Td isActionCell data-testid="agent-runtime-actions">
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
          </Td>
        )}
      </Tr>
      {isEndpointsModalOpen && (
        <AgentRuntimeEndpointsModal
          runtime={runtime}
          onClose={() => setIsEndpointsModalOpen(false)}
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
              .catch(() => undefined) // error already shown via notification; modal stays open for retry
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
