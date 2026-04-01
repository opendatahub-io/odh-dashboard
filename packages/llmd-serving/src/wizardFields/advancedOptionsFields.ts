import type {
  ExternalRouteField,
  TokenAuthField,
  DeploymentStrategyField,
  TimeoutConfigField,
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

export const timeoutConfigField: TimeoutConfigField = {
  id: 'timeoutConfig',
  type: 'modifier',
  isVisible: false, // Hide timeout config for LLMD deployments
  isActive: isLLMInferenceServiceActive,
};
