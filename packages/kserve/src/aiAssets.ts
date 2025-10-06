import { KServeDeployment } from './deployments';
import { AvailableAiAssetsFieldsData } from '../../model-serving/src/components/deploymentWizard/fields/AvailableAiAssetsFields';

export const extractModelAvailabilityData = (
  kserveDeployment: KServeDeployment,
): AvailableAiAssetsFieldsData => {
  return {
    saveAsAiAsset:
      kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true',
    useCase: kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};
