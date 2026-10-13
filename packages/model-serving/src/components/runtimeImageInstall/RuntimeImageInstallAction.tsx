import React from 'react';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import type { RuntimeImageInstallActionProps } from '@mf/modelRegistry/extension-points';
import { getRuntimeImageInstallRoute } from './utils';

const RuntimeImageInstallAction: React.FC<RuntimeImageInstallActionProps> = ({ actionData }) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="secondary"
      data-testid="runtime-image-install"
      onClick={() =>
        navigate(getRuntimeImageInstallRoute(actionData.runtimeImageId), { state: { actionData } })
      }
    >
      Install
    </Button>
  );
};

export default RuntimeImageInstallAction;
