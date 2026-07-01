import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useCanDeployAgent } from '~/app/hooks/useCanDeployAgent';

type DeployAgentButtonProps = {
  namespace?: string;
  onDeployAgent: () => void;
};

const DeployAgentButton: React.FC<DeployAgentButtonProps> = ({ namespace, onDeployAgent }) => {
  const { canDeploy, loaded, disabledReason } = useCanDeployAgent(namespace);
  const isDeployDisabled = !canDeploy || !loaded;

  const handleDeployAgent = React.useCallback(() => {
    if (isDeployDisabled) {
      return;
    }
    onDeployAgent();
  }, [isDeployDisabled, onDeployAgent]);

  const deployButton = (
    <Button
      variant="primary"
      data-testid="deploy-agent-button"
      isAriaDisabled={isDeployDisabled}
      onClick={handleDeployAgent}
    >
      Deploy agent
    </Button>
  );

  if (isDeployDisabled) {
    return <Tooltip content={disabledReason}>{deployButton}</Tooltip>;
  }

  return deployButton;
};

export default DeployAgentButton;
