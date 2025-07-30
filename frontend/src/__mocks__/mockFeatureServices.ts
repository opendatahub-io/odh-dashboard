/* eslint-disable camelcase */
import { FeatureService, FeatureServices } from '#~/pages/featureStore/types/featureServices';

export const mockFeatureService = (partial?: Partial<FeatureService>): FeatureService => ({
  spec: {
    name: 'credit_assessment_v1',
    features: {
      name: 'payment_stability_score',
      featureView: 'risk_scores',
      type: 'DOUBLE',
      project: 'fraud-detection',
      owner: 'risk-team@company.com',
      tags: {
        type: 'score',
        model_output: 'true',
        risk_factor: 'high',
        range: '0-100',
        behavioral: 'true',
      },
      description: 'Payment behavior stability score (0-100, higher is better)',
    },
    tags: {
      version: 'v1',
      team: 'risk',
      use_case: 'credit_scoring',
      environment: 'production',
      compliance: 'gdpr_compliant',
    },
    description: 'Complete feature set for credit risk assessment and loan approval decisions',
    owner: 'risk-team@company.com',
  },
  meta: {
    createdTimestamp: '2025-06-30T07:46:22.716396Z',
    lastUpdatedTimestamp: '2025-06-30T07:46:22.716396Z',
  },
  ...partial,
});

export const mockEntities = ({
  featureServices = [mockFeatureService({})],
}: Partial<FeatureServices>): FeatureServices => ({
  featureServices,
});
