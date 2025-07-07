import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import DeployRegisteredVersionModal from './DeployRegisteredVersionModal';
import useDeployButtonState from './useDeployButtonState';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
}> = ({ platform, variant = 'primary', isDisabled }) => {
  const deployButton = (
    <Button
      variant={variant}
      data-testid="deploy-button"
      // onClick={() => {
      //   do something
      // }}
      isAriaDisabled={isDisabled}
    >
      Deploy model
    </Button>
  );
  if (!platform || isDisabled) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To deploy a model, select a project.">
        {deployButton}
      </Tooltip>
    );
  }
  return <>{deployButton}</>;
};

export const ModelVersionDeployButton: React.FC<{
  modelVersion: ModelVersion;
}> = ({ modelVersion }) => {
  const deployButtonState = useDeployButtonState();
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);

  const deployButton = (
    <Button
      id="deploy-button"
      aria-label="Deploy version"
      variant={ButtonVariant.primary}
      onClick={() => {
        setIsDeployModalOpen(true);
      }}
      isAriaDisabled={!deployButtonState.enabled}
      data-testid="deploy-button"
    >
      Deploy
    </Button>
  );

  return (
    <>
      {deployButtonState.visible &&
        (deployButtonState.tooltip ? (
          <Tooltip content={deployButtonState.tooltip} />
        ) : (
          deployButton
        ))}
      {isDeployModalOpen && (
        <DeployRegisteredVersionModal
          modelVersion={modelVersion}
          onCancel={() => setIsDeployModalOpen(false)}
          onSubmit={() => {
            setIsDeployModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export const ModelVersionRowActionColumn: React.FC<{
  modelVersion: ModelVersion;
  actions: IAction[];
}> = ({ modelVersion, actions }) => {
  const deployButtonState = useDeployButtonState();
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);

  const deployActions: IAction[] = deployButtonState.visible
    ? [
        {
          title: 'Deploy',
          onClick: () => setIsDeployModalOpen(true),
          isAriaDisabled: !deployButtonState.enabled,
          tooltipProps: !deployButtonState.enabled
            ? { content: deployButtonState.tooltip }
            : undefined,
        },
        ...actions,
      ]
    : actions;

  return (
    <>
      <ActionsColumn items={deployActions} />
      {isDeployModalOpen && (
        <DeployRegisteredVersionModal
          modelVersion={modelVersion}
          onCancel={() => setIsDeployModalOpen(false)}
          onSubmit={() => {
            setIsDeployModalOpen(false);
          }}
        />
      )}
    </>
  );
};
