import * as React from 'react';
import { Button, Tooltip, Text } from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

type ModelServingPlatformButtonActionProps = {
  isProjectModelMesh: boolean;
  emptyTemplates: boolean;
  onClick: (e: React.MouseEvent) => void;
};

const ModelServingPlatformButtonAction: React.FC<ModelServingPlatformButtonActionProps> = ({
  onClick,
  emptyTemplates,
  isProjectModelMesh,
}) => {
  const {
    servingRuntimeTemplates: { loaded: templatesLoaded },
  } = React.useContext(ProjectDetailsContext);

  const actionButton = () => (
    <Button
      isLoading={!templatesLoaded}
      isAriaDisabled={!templatesLoaded || emptyTemplates}
      onClick={onClick}
      variant="secondary"
    >
      {isProjectModelMesh ? 'Add model server' : 'Deploy model'}
    </Button>
  );

  if (!emptyTemplates) {
    return actionButton();
  }

  return (
    <Tooltip
      aria-label="Model Serving Action Info"
      content={
        <Text>{`At least one serving runtime must be enabled to ${
          isProjectModelMesh ? 'add a model server' : 'deploy a model'
        }. Contact your administrator.`}</Text>
      }
    >
      {actionButton()}
    </Tooltip>
  );
};

export default ModelServingPlatformButtonAction;
