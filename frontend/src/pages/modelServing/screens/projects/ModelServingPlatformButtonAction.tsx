import * as React from 'react';
import { Button, ButtonProps, Content, Tooltip } from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';

type ModelServingPlatformButtonActionProps = ButtonProps & {
  isProjectModelMesh: boolean;
  emptyTemplates: boolean;
  testId?: string;
};

const ModelServingPlatformButtonAction: React.FC<ModelServingPlatformButtonActionProps> = ({
  emptyTemplates,
  testId,
  isProjectModelMesh,
  variant = 'secondary',
  ...buttonProps
}) => {
  const {
    servingRuntimeTemplates: [, templatesLoaded],
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const servingPlatformStatuses = useServingPlatformStatuses();
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;
  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);
  const isNimDisabled = !isNIMAvailable && isKServeNIMEnabled;

  const actionButton = (
    <Button
      {...buttonProps}
      isLoading={!templatesLoaded}
      isAriaDisabled={!templatesLoaded || emptyTemplates || isNimDisabled}
      data-testid={testId}
      variant={variant}
    >
      {isProjectModelMesh ? 'Add model server' : 'Deploy model'}
    </Button>
  );

  if (!emptyTemplates && !isNimDisabled) {
    return actionButton;
  }

  return (
    <Tooltip
      data-testid="deploy-model-tooltip"
      aria-label="Model Serving Action Info"
      content={
        isNimDisabled ? (
          'NIM is not available. Contact your administrator.'
        ) : (
          <Content component="p">{`At least one serving runtime must be enabled to ${
            isProjectModelMesh ? 'add a model server' : 'deploy a model'
          }. Contact your administrator.`}</Content>
        )
      }
    >
      {actionButton}
    </Tooltip>
  );
};

export default ModelServingPlatformButtonAction;
