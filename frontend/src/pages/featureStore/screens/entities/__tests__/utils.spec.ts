import { Entity, EntityRelationship } from '#~/pages/featureStore/types/entities';
import {
  getRelationshipsByTargetType,
  getNestedValue,
  entityTableFilterKeyMapping,
  applyEntityFilters,
} from '#~/pages/featureStore/screens/entities/utils';

describe('getRelationshipsByTargetType', () => {
  const mockRelationships: Record<string, EntityRelationship[]> = {
    driver: [
      {
        source: { name: 'driver', type: 'entity' },
        target: { name: 'feature-view-1', type: 'featureView' },
      },
      {
        source: { name: 'driver', type: 'entity' },
        target: { name: 'feature-service-1', type: 'featureService' },
      },
      {
        source: { name: 'driver', type: 'entity' },
        target: { name: 'data-source-1', type: 'dataSource' },
      },
    ],
    zipcode: [
      {
        source: { name: 'zipcode', type: 'entity' },
        target: { name: 'feature-view-2', type: 'featureView' },
      },
    ],
  };

  it('should filter relationships by target type', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'driver', 'featureView');
    expect(result).toHaveLength(1);
    expect(result[0].target.name).toBe('feature-view-1');
    expect(result[0].target.type).toBe('featureView');
  });

  it('should return empty array when no relationships exist for entity', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'nonexistent', 'featureView');
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no relationships match target type', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'driver', 'nonexistentType');
    expect(result).toHaveLength(0);
  });

  it('should handle multiple relationships of same type', () => {
    const relationshipsWithMultiple: Record<string, EntityRelationship[]> = {
      driver: [
        {
          source: { name: 'driver', type: 'entity' },
          target: { name: 'feature-view-1', type: 'featureView' },
        },
        {
          source: { name: 'driver', type: 'entity' },
          target: { name: 'feature-view-2', type: 'featureView' },
        },
      ],
    };

    const result = getRelationshipsByTargetType(relationshipsWithMultiple, 'driver', 'featureView');
    expect(result).toHaveLength(2);
    expect(result[0].target.name).toBe('feature-view-1');
    expect(result[1].target.name).toBe('feature-view-2');
  });
});

describe('getNestedValue', () => {
  const mockObject = {
    spec: {
      name: 'test-entity',
      tags: {
        environment: 'production',
        team: 'ml',
      },
    },
    meta: {
      createdTimestamp: '2023-01-01T00:00:00Z',
    },
  };

  it('should get nested value with dot notation', () => {
    const result = getNestedValue(mockObject, 'spec.name');
    expect(result).toBe('test-entity');
  });

  it('should get deeply nested value', () => {
    const result = getNestedValue(mockObject, 'spec.tags.environment');
    expect(result).toBe('production');
  });

  it('should return undefined for non-existent path', () => {
    const result = getNestedValue(mockObject, 'spec.nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return undefined for deeply non-existent path', () => {
    const result = getNestedValue(mockObject, 'spec.tags.nonexistent');
    expect(result).toBeUndefined();
  });

  it('should handle empty path', () => {
    const result = getNestedValue(mockObject, '');
    expect(result).toBe(mockObject);
  });

  it('should handle null/undefined object', () => {
    expect(getNestedValue(null as unknown as Record<string, unknown>, 'spec.name')).toBeUndefined();
    expect(
      getNestedValue(undefined as unknown as Record<string, unknown>, 'spec.name'),
    ).toBeUndefined();
  });
});

describe('entityTableFilterKeyMapping', () => {
  it('should have correct mapping for all filter keys', () => {
    expect(entityTableFilterKeyMapping.entity).toBe('spec.name');
    expect(entityTableFilterKeyMapping.joinKey).toBe('spec.joinKey');
    expect(entityTableFilterKeyMapping.valueType).toBe('spec.valueType');
    expect(entityTableFilterKeyMapping.owner).toBe('spec.owner');
    expect(entityTableFilterKeyMapping.project).toBe('project');
    expect(entityTableFilterKeyMapping.tag).toBe('spec.tags');
    expect(entityTableFilterKeyMapping.featureViews).toBe('featureViews');
  });
});

describe('applyEntityFilters', () => {
  const mockEntities: Entity[] = [
    {
      spec: {
        name: 'driver',
        valueType: 'string',
        description: 'Driver entity',
        joinKey: 'driver_id',
        tags: { environment: 'production', team: 'ml' },
        owner: 'team-a',
      },
      meta: {
        createdTimestamp: '2023-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
      },
      project: 'project-a',
    },
    {
      spec: {
        name: 'zipcode',
        valueType: 'int',
        description: 'Zipcode entity',
        joinKey: 'zipcode_id',
        tags: { environment: 'staging', team: 'data' },
        owner: 'team-b',
      },
      meta: {
        createdTimestamp: '2023-01-03T00:00:00Z',
        lastUpdatedTimestamp: '2023-01-04T00:00:00Z',
      },
      project: 'project-b',
    },
  ];

  const mockRelationships: Record<string, EntityRelationship[]> = {
    driver: [
      {
        source: { name: 'driver', type: 'entity' },
        target: { name: 'feature-view-1', type: 'featureView' },
      },
      {
        source: { name: 'driver', type: 'entity' },
        target: { name: 'feature-view-2', type: 'featureView' },
      },
    ],
    zipcode: [
      {
        source: { name: 'zipcode', type: 'entity' },
        target: { name: 'feature-view-3', type: 'featureView' },
      },
    ],
  };

  it('should return all entities when no filters applied', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {});
    expect(result).toHaveLength(2);
  });

  it('should filter by entity name', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      entity: 'driver',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should filter by value type', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      valueType: 'string',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.valueType).toBe('string');
  });

  it('should filter by owner', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      owner: 'team-a',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.owner).toBe('team-a');
  });

  it('should filter by project', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      project: 'project-a',
    });
    expect(result).toHaveLength(1);
    expect(result[0].project).toBe('project-a');
  });

  it('should filter by tags', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      tag: 'production',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should filter by feature views', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      featureViews: 'feature-view-1',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should apply multiple filters', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      entity: 'driver',
      valueType: 'string',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should return empty array when no entities match filters', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      entity: 'nonexistent',
    });
    expect(result).toHaveLength(0);
  });

  it('should handle case-insensitive filtering', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      entity: 'DRIVER',
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should handle filter with object value', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      entity: { label: 'Driver Entity', value: 'driver' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('driver');
  });

  it('should ignore unknown filter keys', () => {
    const result = applyEntityFilters(mockEntities, mockRelationships, {
      unknownKey: 'value',
    });
    expect(result).toHaveLength(2);
  });

  it('should handle entities with missing optional properties', () => {
    const entitiesWithMissingProps: Entity[] = [
      {
        spec: {
          name: 'test',
          valueType: '',
          description: '',
          joinKey: '',
          tags: {},
          owner: '',
        },
        meta: {
          createdTimestamp: '',
          lastUpdatedTimestamp: '',
        },
      },
    ];

    const result = applyEntityFilters(
      entitiesWithMissingProps,
      {},
      {
        entity: 'test',
      },
    );
    expect(result).toHaveLength(1);
  });

  it('should handle empty relationships object', () => {
    const result = applyEntityFilters(
      mockEntities,
      {},
      {
        featureViews: 'feature-view-1',
      },
    );
    expect(result).toHaveLength(0);
  });
});
