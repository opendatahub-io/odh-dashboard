import React from 'react';
import { Button } from '@patternfly/react-core';
import { Link, type LinkProps } from 'react-router-dom';
import type { RuntimeImageInstallActionProps } from '@mf/modelRegistry/extension-points';
import { getRuntimeImageInstallRoute } from './utils';

const RuntimeImageInstallAction: React.FC<RuntimeImageInstallActionProps> = ({ actionData }) => (
  <Button
    variant="secondary"
    data-testid="runtime-image-install"
    component={(props: LinkProps) => (
      <Link
        {...props}
        to={getRuntimeImageInstallRoute(actionData.runtimeImageId)}
        state={{ actionData }}
      />
    )}
  >
    Install
  </Button>
);

export default RuntimeImageInstallAction;
