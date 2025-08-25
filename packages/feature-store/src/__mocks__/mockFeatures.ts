/* eslint-disable camelcase */
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
    total_count: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false,
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
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
});
