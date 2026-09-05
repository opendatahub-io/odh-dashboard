/* eslint-disable camelcase */
import { mockEntity } from './mockEntities';
import { mockDataSource } from './mockDataSources';
import { mockFeatureView } from './mockFeatureViews';
import { mockFeatureService } from './mockFeatureServices';
import { FeatureStoreLineage } from '../types/lineage';

const emptyPagination = {
  totalCount: 0,
  totalPages: 0,
};

export const mockFeatureStoreLineage = (
  partial?: Partial<FeatureStoreLineage>,
): FeatureStoreLineage => {
  const featureView = mockFeatureView();

  return {
    project: 'credit_scoring_local',
    objects: {
      entities: [mockEntity()],
      dataSources: [mockDataSource({ name: 'loan_data' })],
      featureViews: [{ featureView: { spec: featureView.spec, meta: featureView.meta } }],
      featureServices: [mockFeatureService({ name: 'credit_scoring_service' })],
      features: [],
    },
    relationships: [
      {
        source: { type: 'entity', name: 'user_id' },
        target: { type: 'featureView', name: 'zipcode_features' },
      },
      {
        source: { type: 'dataSource', name: 'loan_data' },
        target: { type: 'featureView', name: 'zipcode_features' },
      },
      {
        source: { type: 'featureView', name: 'zipcode_features' },
        target: { type: 'featureService', name: 'credit_scoring_service' },
      },
    ],
    indirectRelationships: [],
    pagination: {
      entities: emptyPagination,
      dataSources: emptyPagination,
      featureViews: emptyPagination,
      featureServices: emptyPagination,
      features: emptyPagination,
      relationships: emptyPagination,
      indirectRelationships: emptyPagination,
    },
    ...partial,
  };
};
