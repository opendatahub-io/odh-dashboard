import * as React from 'react';
import { Button, Tooltip, Content, ButtonProps } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

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
  } = React.useContext(ProjectDetailsContext);

  const actionButton = () => (
    <Button
      {...buttonProps}
      isLoading={!templatesLoaded}
      isAriaDisabled={!templatesLoaded || emptyTemplates}
      data-testid={testId}
      variant={variant}
    >
      {isProjectModelMesh ? 'Add model server' : 'Deploy model'}
    </Button>
  );

  if (!emptyTemplates) {
    return actionButton();
  }

  return (
    <Tooltip
      data-testid="model-serving-action-tooltip"
      aria-label="Model Serving Action Info"
      content={
        <Content component="p">{`At least one serving runtime must be enabled to ${
          isProjectModelMesh ? 'add a model server' : 'deploy a model'
        }. Contact your administrator.`}</Content>
      }
    >
      {actionButton()}
    </Tooltip>
  );
};

export default ModelServingPlatformButtonAction;
