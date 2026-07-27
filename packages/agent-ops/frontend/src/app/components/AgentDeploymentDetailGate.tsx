import * as React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAgentOpsDeploy } from '~/app/hooks/useAgentOpsDeploy';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

type AgentDeploymentDetailGateProps = {
  children: React.ReactNode;
};

const AgentDeploymentDetailGate: React.FC<AgentDeploymentDetailGateProps> = ({ children }) => {
  const deployMode = useAgentOpsDeploy();
  const { namespace } = useParams<{ namespace: string }>();

  if (!deployMode) {
    return <Navigate to={agentOpsDeploymentsRoute(namespace)} replace />;
  }

  return children;
};

export default AgentDeploymentDetailGate;
