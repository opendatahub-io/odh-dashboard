import * as React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { useCheckJupyterEnabled } from '#~/utilities/notebookControllerUtils';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';

const LaunchJupyterButton: React.FC = () => {
  const isJupyterEnabled = useCheckJupyterEnabled();
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  if (!isJupyterEnabled || !workbenchEnabled) {
    return null;
  }

  return (
    <Tooltip
      position="left"
      content="Create a limited-use workbench that is not associated with a project."
    >
      <Button
        data-testid="launch-standalone-notebook-server"
        component={(props) => <Link {...props} to="/notebook-controller" />}
        variant={ButtonVariant.secondary}
      >
        Start basic workbench
      </Button>
    </Tooltip>
  );
};

export default LaunchJupyterButton;
