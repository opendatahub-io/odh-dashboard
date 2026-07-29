import { DeploymentStrategyFieldOverride } from '@odh-dashboard/model-serving/shared/types/form-data';
import { isKServeInferenceServiceActive } from './timeout/TimeoutField';

export const kserveDeploymentStrategyOverride: DeploymentStrategyFieldOverride = {
  id: 'deploymentStrategy',
  type: 'modifier',
  isVisible: true,
  isActive: isKServeInferenceServiceActive,
};
