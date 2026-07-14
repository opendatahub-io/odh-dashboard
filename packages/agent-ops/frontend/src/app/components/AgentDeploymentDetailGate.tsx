import * as React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAgentOpsDiscoveryMode } from '~/app/hooks/useAgentOpsDiscoveryMode';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

type AgentDeploymentDetailGateProps = {
  children: React.ReactNode;
};

const AgentDeploymentDetailGate: React.FC<AgentDeploymentDetailGateProps> = ({ children }) => {
  const discoveryMode = useAgentOpsDiscoveryMode();
  const { namespace } = useParams<{ namespace: string }>();

  if (discoveryMode) {
    return <Navigate to={agentOpsDeploymentsRoute(namespace)} replace />;
  }

  return children;
};

export default AgentDeploymentDetailGate;
