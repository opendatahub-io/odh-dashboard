import type {
  ExternalRouteField,
  TokenAuthField,
  DeploymentStrategyField,
} from '@odh-dashboard/model-serving/types/form-data';
import { isLLMInferenceServiceActive } from '../formUtils';

export const externalRouteField: ExternalRouteField = {
  id: 'externalRoute',
  type: 'modifier',
  isVisible: false, // Hide external route for LLMD deployments
  isActive: isLLMInferenceServiceActive,
};

export const tokenAuthField: TokenAuthField = {
  id: 'tokenAuth',
  type: 'modifier',
  initialValue: true, // Default to checked for LLMD deployments
  isActive: isLLMInferenceServiceActive,
};

export const deploymentStrategyField: DeploymentStrategyField = {
  id: 'deploymentStrategy',
  type: 'modifier',
  isVisible: false,
  isActive: isLLMInferenceServiceActive,
};
