import * as React from 'react';
import { Button, ButtonProps } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import { addSupportServingPlatformProject } from '~/api';

type ModelServingPlatformSelectButtonProps = ButtonProps & {
  namespace: string;
  servingPlatform:
    | NamespaceApplicationCase.MODEL_MESH_PROMOTION
    | NamespaceApplicationCase.KSERVE_PROMOTION
    | NamespaceApplicationCase.KSERVE_NIM_PROMOTION
    | NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM;
  setError: (e?: Error) => void;
};

const buttonLabels = {
  [NamespaceApplicationCase.MODEL_MESH_PROMOTION]: 'Select multi-model',
  [NamespaceApplicationCase.KSERVE_PROMOTION]: 'Select single-model',
  [NamespaceApplicationCase.KSERVE_NIM_PROMOTION]: 'Select NVIDIA NIM',
  [NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM]: 'Change',
};

const ModelServingPlatformSelectButton: React.FC<ModelServingPlatformSelectButtonProps> = ({
  namespace,
  servingPlatform,
  setError,
  ...buttonProps
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const isResetAction = servingPlatform === NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM;

  return (
    <Button
      {...buttonProps}
      aria-label={isResetAction ? 'Change model serving platform' : undefined}
      icon={isResetAction ? <PencilAltIcon /> : undefined}
      isLoading={isLoading}
      isDisabled={isLoading}
      onClick={async () => {
        try {
          setError(undefined);
          setIsLoading(true);
          await addSupportServingPlatformProject(namespace, servingPlatform);
        } catch (e) {
          if (e instanceof Error) {
            setIsLoading(false);
            setError(e);
          }
        }
      }}
    >
      {buttonLabels[servingPlatform]}
    </Button>
  );
};

export default ModelServingPlatformSelectButton;
