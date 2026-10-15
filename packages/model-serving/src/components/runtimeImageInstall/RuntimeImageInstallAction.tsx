import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { Link, type LinkProps } from 'react-router-dom';
import type { RuntimeImageInstallActionProps } from '@mf/modelRegistry/extension-points';
import { fireCreateStarted } from './tracking/runtimeImageInstallTracking';
import { getAvailableInstallTargets, getRuntimeImageInstallRoute } from './utils';
import { isRuntimeImageInstallTargetExtension } from '../../../extension-points/runtime-image-install-target';

const RuntimeImageInstallAction: React.FC<RuntimeImageInstallActionProps> = ({ actionData }) => {
  const installTargetExtensions = useExtensions(isRuntimeImageInstallTargetExtension);
  const canInstall = getAvailableInstallTargets(actionData, installTargetExtensions).length > 0;

  const handleCreateStarted = React.useCallback(() => {
    fireCreateStarted({
      runtimeName: actionData.runtimeImageName,
      version: actionData.version ?? 'unknown',
      hardware: actionData.hardware ?? 'unknown',
    });
  }, [actionData.runtimeImageName, actionData.version, actionData.hardware]);

  if (!canInstall) {
    return (
      <Tooltip content="No supported installation targets are enabled for this runtime image.">
        <Button variant="secondary" data-testid="runtime-image-install" isAriaDisabled>
          Install
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="secondary"
      data-testid="runtime-image-install"
      onClick={handleCreateStarted}
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
};

export default RuntimeImageInstallAction;
