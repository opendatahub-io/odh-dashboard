import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import type { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const ResetPlatformButton: React.FC<{
  platforms: ModelServingPlatform[];
  hasDeployments: boolean;
  isLoading: boolean;
  onReset: () => void;
}> = ({ platforms, hasDeployments, isLoading, onReset }) => {
  const hasPlatformsToChoose = platforms.length > 1;

  const isDisabled = isLoading || hasDeployments;
  const disabledReason = hasDeployments
    ? 'To change the model serving platform, delete all models and model servers in the project. This project contains models or servers not managed by the dashboard.'
    : undefined;

  if (!hasPlatformsToChoose) {
    return null;
  }

  const button = (
    <Button
      data-testid="change-serving-platform-button"
      variant="link"
      isInline
      icon={<PencilAltIcon />}
      isLoading={isLoading}
      isAriaDisabled={isDisabled}
      onClick={onReset}
    >
      Change
    </Button>
  );

  if (isDisabled && disabledReason) {
    return <Tooltip content={disabledReason}>{button}</Tooltip>;
  }

  return <>{button}</>;
};
