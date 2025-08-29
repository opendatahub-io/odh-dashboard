import * as React from 'react';
import { Button, ButtonProps, Content, Tooltip } from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import { KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE } from '#~/concepts/hardwareProfiles/kueueConstants';

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

  const { isKueueDisabled } = useKueueConfiguration(currentProject);

  const actionButton = (
    <Button
      {...buttonProps}
      isLoading={!templatesLoaded}
      isAriaDisabled={
        !templatesLoaded ||
        emptyTemplates ||
        isNimDisabled ||
        (!isProjectModelMesh && isKueueDisabled)
      }
      data-testid={testId}
      variant={variant}
    >
      {isProjectModelMesh ? 'Add model server' : 'Deploy model'}
    </Button>
  );

  if (!emptyTemplates && !isNimDisabled && !(!isProjectModelMesh && isKueueDisabled)) {
    return actionButton;
  }

  return (
    <Tooltip
      data-testid="deploy-model-tooltip"
      aria-label="Model Serving Action Info"
      content={
        isNimDisabled ? (
          'NIM is not available. Contact your administrator.'
        ) : !isProjectModelMesh && isKueueDisabled ? (
          KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE
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
