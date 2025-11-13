import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import { CatalogModel } from '~/app/modelCatalogTypes';
import ModelCatalogDeployModalWrapper from './ModelCatalogDeployWrapper';

export const ModelCatalogDeployButton = ({
  model,
  renderRegisterButton,
}: {
  model: CatalogModel;
  renderRegisterButton?: (isDeployAvailable: boolean) => React.ReactNode;
}) => (
  <ModelCatalogDeployModalWrapper
    model={model}
    render={(buttonState, onOpenWizard, isWizardAvailable) => {
      const deployButton = (
        <Button
          id="deploy-button"
          aria-label="Deploy model"
          variant={ButtonVariant.primary}
          onClick={buttonState?.enabled ? onOpenWizard : undefined}
          isAriaDisabled={!buttonState?.enabled}
          data-testid="deploy-button"
        >
          Deploy model
        </Button>
      );

      const wrappedDeployButton = isWizardAvailable ? (
        buttonState.tooltip ? (
          <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
        ) : (
          deployButton
        )
      ) : null;

      return (
        <>
          {wrappedDeployButton}
          {renderRegisterButton?.(isWizardAvailable)}
        </>
      );
    }}
  />
);
