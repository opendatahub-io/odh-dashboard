import { Button, EmptyStateActions, type ButtonProps } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { modelVersionRoute } from '#~/routes/modelRegistry/modelVersions.ts';

/**
 * Shown when the selected project for deploying the registered model doesn't have a platform selected.
 * Only shows when `modelVersionId`, `registeredModelId` and `modelRegistryName` are present in the URL.
 * @param isEmptyStateAction - If true, the button is shown in the empty state actions for the no models view.
 */
export const NavigateBackToRegistryButton: React.FC<
  ButtonProps & { isEmptyStateAction?: boolean }
> = ({ isEmptyStateAction, ...props }) => {
  const navigate = useNavigate();
  const [queryParams] = useSearchParams();
  const modelVersionId = queryParams.get('modelVersionId');
  const registeredModelId = queryParams.get('registeredModelId');
  const modelRegistryName = queryParams.get('modelRegistryName');

  if (!modelVersionId || !registeredModelId || !modelRegistryName) {
    return null;
  }

  const button = (
    <Button
      {...props}
      variant="link"
      onClick={() =>
        navigate(modelVersionRoute(modelVersionId, registeredModelId, modelRegistryName))
      }
      data-testid="deploy-from-registry"
    >
      Deploy model from model registry
    </Button>
  );

  if (isEmptyStateAction) {
    return <EmptyStateActions>{button}</EmptyStateActions>;
  }

  return button;
};
