import * as React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';

const LaunchJupyterButton: React.FC = () => {
  const navigate = useNavigate();
  const isJupyterEnabled = useCheckJupyterEnabled();
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  if (!isJupyterEnabled || !workbenchEnabled) {
    return null;
  }

  return (
    <Tooltip
      position="left"
      content="Launch a notebook server to create a standalone workbench outside of a project."
    >
      <Button
        data-testid="launch-standalone-notebook-server"
        href="/notebookController"
        component="a"
        variant={ButtonVariant.secondary}
        onClick={(e) => {
          e.preventDefault();
          navigate('/notebookController');
        }}
      >
        Launch standalone workbench
      </Button>
    </Tooltip>
  );
};

export default LaunchJupyterButton;
