import React from 'react';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { Deployment } from '../extension-points';

/**
 * Creates a filter function for deployments based on model registry name.
 * Returns all deployments that either match the mrName or don't have a model registry label.
 */
export const useModelRegistryFilter = (
  mrName?: string,
): ((model: Deployment['model']) => boolean) => {
  return React.useCallback(
    (model: Deployment['model']) => {
      if (!mrName) {
        return true;
      }
      return (
        model.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME] === mrName ||
        !model.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME]
      );
    },
    [mrName],
  );
};
