import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ExternalRouteField,
  TokenAuthField,
  DeploymentStrategyField,
} from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const externalRouteField: ExternalRouteField = {
  id: 'externalRoute',
  type: 'modifier',
  isVisible: false, // Hide external route for LLMD deployments
  isActive: (context): boolean => {
    return (
      context.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      context.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
};

export const tokenAuthField: TokenAuthField = {
  id: 'tokenAuth',
  type: 'modifier',
  initialValue: true, // Default to checked for LLMD deployments
  isActive: (context): boolean => {
    return (
      context.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      context.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
};

export const deploymentStrategyField: DeploymentStrategyField = {
  id: 'deploymentStrategy',
  type: 'modifier',
  isVisible: false,
  isActive: (context): boolean => {
    return (
      context.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
      context.modelServer?.data?.name === LLMD_SERVING_ID
    );
  },
};
