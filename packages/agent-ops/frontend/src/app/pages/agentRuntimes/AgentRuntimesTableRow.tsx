import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Button, Truncate } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const detailRoute = agentOpsDeploymentDetailRoute(runtime.namespace, runtime.name);

  const { visibility, isPending, isDeleting, handleRestart, handleStop, handleDelete } =
    useAgentLifecycleActions({ runtime, onRefresh });

  const hasEndpoints = React.useMemo(
    () => getAgentRuntimeEndpointFields(runtime).length > 0,
    [runtime],
  );

  const actions: IAction[] = React.useMemo(() => {
    if (discoveryMode) {
      return [];
    }

    const nextActions: IAction[] = [
      {
        title: 'View details',
        onClick: () => navigate(detailRoute),
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
    navigate,
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
            <ActionsColumn items={actions} />
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
          isDeleting={isDeleting}
          onConfirm={() => {
            void handleDelete()
              .then(() => setIsDeleteModalOpen(false))
              .catch(() => undefined); // error already shown via notification; modal stays open for retry
          }}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </>
  );
};

export default AgentRuntimesTableRow;
