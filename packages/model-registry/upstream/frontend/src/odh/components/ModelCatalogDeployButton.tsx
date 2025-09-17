import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { CatalogModel } from '~/app/modelCatalogTypes';
import ModelCatalogDeployModalExtension from './ModelCatalogDeployModalExtension';

export const ModelCatalogDeployButton = ({
  model,
  renderRegisterButton,
}: {
  model: CatalogModel;
  renderRegisterButton?: (isDeployAvailable: boolean) => React.ReactNode;
}) => (
  <ModelCatalogDeployModalExtension
    model={model}
    render={(buttonState, onOpenModal, isModalAvailable) => {
      const deployButton = (
        <Button
          id="deploy-button"
          aria-label="Deploy model"
          variant={ButtonVariant.primary}
          onClick={buttonState?.enabled ? onOpenModal : undefined}
          isAriaDisabled={!buttonState?.enabled}
          data-testid="deploy-button"
        >
          Deploy model
        </Button>
      );

      const wrappedDeployButton = isModalAvailable ? (
        buttonState.tooltip ? (
          <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
        ) : (
          deployButton
        )
      ) : null;

      return (
        <>
          {wrappedDeployButton}
          {renderRegisterButton?.(isModalAvailable)}
        </>
      );
    }}
  />
);
