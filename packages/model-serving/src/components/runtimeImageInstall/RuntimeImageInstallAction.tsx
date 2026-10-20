import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api';
import { Link, type LinkProps } from 'react-router-dom';
import type { RuntimeImageInstallActionProps } from '@mf/modelRegistry/extension-points';
import { fireCreateStarted } from './tracking/runtimeImageInstallTracking';
import { getAvailableInstallTargets, getRuntimeImageInstallRoute } from './utils';
import { isRuntimeImageInstallTargetExtension } from '../../../extension-points/runtime-image-install-target';

const RuntimeImageInstallAction: React.FC<RuntimeImageInstallActionProps> = ({ actionData }) => {
  const installTargetExtensions = useExtensions(isRuntimeImageInstallTargetExtension);
  const canInstall = getAvailableInstallTargets(actionData, installTargetExtensions).length > 0;
  const trackEvent = useTrackEvent();

  const handleCreateStarted = React.useCallback(() => {
    fireCreateStarted(trackEvent, {
      runtimeName: actionData.runtimeImageName,
      version: actionData.version ?? 'unknown',
      hardware: actionData.hardware ?? 'unknown',
    });
  }, [trackEvent, actionData.runtimeImageName, actionData.version, actionData.hardware]);

  if (!canInstall) {
    return (
      <Tooltip content="No supported installation targets are enabled for this runtime image.">
        <Button variant="primary" data-testid="runtime-image-install" isAriaDisabled>
          Create
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="primary"
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
      Create
    </Button>
  );
};

export default RuntimeImageInstallAction;
