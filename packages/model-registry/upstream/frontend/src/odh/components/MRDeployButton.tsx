import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { ModelVersion } from '~/app/types';
import DeployModalExtension from '~/odh/components/DeployModalExtension';

export const MRDeployButton = ({ mv }: { mv: ModelVersion }) => (
  <DeployModalExtension
    mv={mv}
    render={(buttonState, onOpenModal, isModalAvailable) => {
      const deployButton = (
        <Button
          id="deploy-button"
          aria-label="Deploy version"
          variant={ButtonVariant.primary}
          onClick={onOpenModal}
          isAriaDisabled={!buttonState?.enabled}
          data-testid="deploy-button"
        >
          Deploy
        </Button>
      );
      return isModalAvailable ? (
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
          ) : (
            deployButton
          )}
        </FlexItem>
      ) : null;
    }}
  />
);
