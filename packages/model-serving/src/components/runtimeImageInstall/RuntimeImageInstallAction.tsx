import React from 'react';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { PLACEHOLDER_INSTALL_PATH } from './const';
import type { PlaceholderRuntimeImageActionProps } from './placeholder-types';

const RuntimeImageInstallAction: React.FC<PlaceholderRuntimeImageActionProps> = ({
  actionData,
}) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="secondary"
      data-testid="runtime-image-install"
      onClick={() => navigate(PLACEHOLDER_INSTALL_PATH, { state: { actionData } })}
    >
      Install
    </Button>
  );
};

export default RuntimeImageInstallAction;
