import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Button, Truncate } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { AgentRuntime } from '~/app/types/agentRuntimes';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import AgentRuntimeEndpointsModal from '~/app/components/AgentRuntimeEndpointsModal';
import { getAgentRuntimeEndpointFields } from '~/app/utilities/agentRuntimeEndpoints';
import { agentOpsDeploymentDetailRoute } from '~/app/utilities/routes';
import { agentRuntimesColumns } from './columns';

type AgentRuntimesTableRowProps = {
  runtime: AgentRuntime;
};

const AgentRuntimesTableRow: React.FC<AgentRuntimesTableRowProps> = ({ runtime }) => {
  const [isEndpointsModalOpen, setIsEndpointsModalOpen] = React.useState(false);
  const navigate = useNavigate();
  const detailRoute = agentOpsDeploymentDetailRoute(runtime.namespace, runtime.name);

  const hasEndpoints = React.useMemo(
    () => getAgentRuntimeEndpointFields(runtime).length > 0,
    [runtime],
  );

  const actions: IAction[] = React.useMemo(
    () => [
      {
        title: 'View details',
        onClick: () => navigate(detailRoute),
      },
    ],
    [navigate, detailRoute],
  );

  return (
    <>
      <Tr data-testid={`agent-runtime-row-${runtime.namespace}-${runtime.name}`}>
        <Td dataLabel={agentRuntimesColumns[0].label} data-testid="agent-runtime-name">
          <Link to={detailRoute}>
            <Truncate content={runtime.name} />
          </Link>
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
        <Td isActionCell data-testid="agent-runtime-actions">
          <ActionsColumn items={actions} />
        </Td>
      </Tr>
      {isEndpointsModalOpen && (
        <AgentRuntimeEndpointsModal
          runtime={runtime}
          onClose={() => setIsEndpointsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AgentRuntimesTableRow;
