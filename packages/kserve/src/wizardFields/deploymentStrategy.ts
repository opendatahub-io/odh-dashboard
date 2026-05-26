import { DeploymentStrategyFieldOverride } from '@odh-dashboard/model-serving/components/deploymentWizard/types.js';
import { isKServeInferenceServiceActive } from './timeout/TimeoutField';

export const kserveDeploymentStrategyOverride: DeploymentStrategyFieldOverride = {
  id: 'deploymentStrategy',
  type: 'modifier',
  isVisible: true,
  isActive: isKServeInferenceServiceActive,
};
