import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { ModelCatalogItem } from '~/app/modelCatalogTypes';
import ModelCatalogDeployModalExtension from './ModelCatalogDeployModalExtension';

export const ModelCatalogDeployButton = ({ model }: { model: ModelCatalogItem }) => (
  <ModelCatalogDeployModalExtension
    model={model}
    render={(buttonState, onOpenModal, isModalAvailable) => {
      const deployButton = (
        <Button
          id="deploy-button"
          aria-label="Deploy model"
          variant={ButtonVariant.primary}
          onClick={onOpenModal}
          isAriaDisabled={!buttonState?.enabled}
          data-testid="deploy-button"
        >
          Deploy model
        </Button>
      );
      return isModalAvailable ? (
        buttonState.tooltip ? (
          <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
        ) : (
          deployButton
        )
      ) : null;
    }}
  />
);
