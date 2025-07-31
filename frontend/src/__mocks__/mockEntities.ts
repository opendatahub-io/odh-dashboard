/* eslint-disable camelcase */
import { Entity, EntityList } from '#~/pages/featureStore/types/entities';

export const mockEntity = (partial?: Partial<Entity>): Entity => ({
  spec: {
    name: 'user_id',
    valueType: 'STRING',
    description: 'Unique identifier for each user',
    joinKey: 'user_id',
    tags: {
      join_key: 'true',
      cardinality: 'high',
      domain: 'user',
      pii: 'false',
    },
    owner: 'data-team@company.com',
  },
  featureDefinition:
    'from feast import Entity\n\n__dummy = Entity(\n    name="__dummy",\n    join_keys=[\'__dummy_id\']) ',
  meta: {
    createdTimestamp: '2025-01-15T10:30:00.000000Z',
    lastUpdatedTimestamp: '2025-01-15T10:30:00.000000Z',
  },
  ...partial,
});

export const mockEntities = ({ entities = [] }: Partial<EntityList>): EntityList => ({
  entities,
  pagination: {
    page: 1,
    limit: 50,
    total_count: 2,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
  relationships: {
    user_id: [
      {
        source: {
          type: 'entity',
          name: 'user_id',
        },
        target: {
          type: 'featureView',
          name: 'user_features',
        },
      },
    ],
    transaction_id: [
      {
        source: {
          type: 'entity',
          name: 'transaction_id',
        },
        target: {
          type: 'featureView',
          name: 'transaction_features',
        },
      },
    ],
  },
});
