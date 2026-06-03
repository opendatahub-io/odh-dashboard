import { Features, FeaturesList, FeatureRelationship } from '../types/features';

export const mockFeatureRelationship = (
  partial?: Partial<FeatureRelationship>,
): FeatureRelationship => ({
  source: { type: 'featureView', name: 'source-view' },
  target: { type: 'entity', name: 'target-entity' },
  ...partial,
});

export const mockFeature = (partial?: Partial<Features>): Features => ({
  name: 'test-feature',
  featureView: 'test-feature-view',
  type: 'STRING',
  project: 'test-project',
  owner: 'test-owner@example.com',
  tags: {
    category: 'demographic',
    pii: 'false',
  },
  description: 'A test feature for unit testing',
  relationships: [mockFeatureRelationship()],
  featureDefinition: 'SELECT feature_value FROM table',
  ...partial,
});

export const mockFeaturesList = ({
  features = [mockFeature()],
  pagination = {
    page: 1,
    limit: 10,
    totalCount: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
}: Partial<FeaturesList> = {}): FeaturesList => ({
  features,
  pagination,
});

export const mockEmptyFeaturesList = (): FeaturesList => ({
  features: [],
  pagination: {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  },
});
