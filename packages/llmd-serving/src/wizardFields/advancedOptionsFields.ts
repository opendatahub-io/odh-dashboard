import type {
  ExternalRouteFieldOverride,
  TokenAuthFieldOverride,
  DeploymentStrategyFieldOverride,
} from '@odh-dashboard/model-serving/types/form-data';
import { isLLMInferenceServiceActive } from '../formUtils';

export const externalRouteField: ExternalRouteFieldOverride = {
  id: 'externalRoute',
  type: 'modifier',
  isVisible: false, // Hide external route for LLMD deployments
  isActive: isLLMInferenceServiceActive,
};

export const tokenAuthField: TokenAuthFieldOverride = {
  id: 'tokenAuth',
  type: 'modifier',
  initialValue: true, // Default to checked for LLMD deployments
  isActive: isLLMInferenceServiceActive,
};

export const deploymentStrategyField: DeploymentStrategyFieldOverride = {
  id: 'deploymentStrategy',
  type: 'modifier',
  isVisible: false,
  isActive: isLLMInferenceServiceActive,
};
