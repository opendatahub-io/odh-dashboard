import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { ModelVersion } from '~/app/types';
import useDeployModalExtension from '~/odh/hooks/useDeployModalExtension';

export const MRDeployButton = ({
  mv,
  mvLoaded,
  mvError,
}: {
  mv: ModelVersion;
  mvLoaded: boolean;
  mvError: Error | undefined;
}) => {
  const { deployModal, setOpenModal, buttonState } = useDeployModalExtension({
    mv,
    mvLoaded,
    mvError,
  });

  const deployButton = (
    <Button
      id="deploy-button"
      aria-label="Deploy version"
      variant={ButtonVariant.primary}
      onClick={() => {
        setOpenModal(true);
      }}
      isAriaDisabled={!buttonState?.enabled}
      data-testid="deploy-button"
    >
      Deploy
    </Button>
  );

  return (
    <>
      {buttonState?.visible ? (
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState?.tooltip}>{deployButton}</Tooltip>
          ) : (
            deployButton
          )}
        </FlexItem>
      ) : null}
      {deployModal}
    </>
  );
};
