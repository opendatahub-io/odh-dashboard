import { KServeDeployment } from './deployments';

export const extractModelAvailabilityData = (
  kserveDeployment: KServeDeployment,
): { saveAsAiAsset: boolean; useCase: string } => {
  return {
    saveAsAiAsset:
      kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true',
    useCase: kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};
