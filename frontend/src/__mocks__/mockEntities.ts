import { Entities, Entity } from '#~/concepts/featureStore/types.ts';

export const mockEntity = (partial?: Partial<Entity>): Entity => ({
  spec: {
    name: 'dob_ssn',
    valueType: 'STRING',
    description:
      'Unique identifier combining date of birth and last four digits of SSN for customer identification',
    joinKey: 'dob_ssn',
    tags: {
      sensitive: 'critical',
      regulatory: 'privacy_protected',
      pii: 'true',
      // eslint-disable-next-line camelcase
      join_key: 'true',
      domain: 'customer',
      cardinality: 'high',
    },
  },
  meta: {
    createdTimestamp: '2025-06-30T07:46:22.705314Z',
    lastUpdatedTimestamp: '2025-06-30T07:46:22.705314Z',
  },
  ...partial,
});

export const mockEntities = ({ entities = [mockEntity({})] }: Partial<Entities>): Entities => ({
  entities,
});
