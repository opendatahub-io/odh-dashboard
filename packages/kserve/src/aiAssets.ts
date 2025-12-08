import { ModelAvailabilityFieldsData } from '@odh-dashboard/model-serving/types/form-data';
import { KServeDeployment } from './deployments';

export const extractModelAvailabilityData = (
  kserveDeployment: KServeDeployment,
): ModelAvailabilityFieldsData => {
  return {
    useCase: kserveDeployment.model.metadata.annotations?.['opendatahub.io/genai-use-case'] || '',
  };
};
