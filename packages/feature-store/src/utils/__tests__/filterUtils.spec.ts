import {
  getNestedValue,
  getRelationshipsByTargetType,
  FeatureStoreFilterUtils,
  createFeatureStoreFilterUtils,
  applyTagFilters,
  FilterableItem,
  GenericRelationship,
} from '../filterUtils';

// Mock types for testing
interface MockFilterableItem extends FilterableItem {
  spec: {
    name: string;
    owner?: string;
    tags?: Record<string, string>;
    [key: string]: unknown;
  };
  project?: string;
  meta?: {
    createdTimestamp?: string;
    lastUpdatedTimestamp?: string;
  };
}

interface MockRelationship extends GenericRelationship {
  source: {
    name: string;
    type: string;
  };
  target: {
    name: string;
    type: string;
  };
}

describe('getNestedValue', () => {
  const mockObject = {
    spec: {
      name: 'test-item',
      tags: {
        environment: 'production',
        team: 'ml',
      },
      nested: {
        deep: {
          value: 'deeply nested',
        },
      },
    },
    meta: {
      createdTimestamp: '2023-01-01T00:00:00Z',
    },
  };

  it('should get nested value with dot notation', () => {
    const result = getNestedValue(mockObject, 'spec.name');
    expect(result).toBe('test-item');
  });

  it('should get  deeply nested value', () => {
    const result = getNestedValue(mockObject, 'spec.nested.deep.value');
    expect(result).toBe('deeply nested');
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

  it('should handle arrays in path', () => {
    const objWithArray = { items: [{ name: 'first' }, { name: 'second' }] };
    const result = getNestedValue(objWithArray, 'items');
    expect(result).toEqual([{ name: 'first' }, { name: 'second' }]);
  });
});

describe('getRelationshipsByTargetType', () => {
  const mockRelationships: Record<string, MockRelationship[]> = {
    'test-item': [
      {
        source: { name: 'test-item', type: 'entity' },
        target: { name: 'feature-view-1', type: 'featureView' },
      },
      {
        source: { name: 'test-item', type: 'entity' },
        target: { name: 'feature-service-1', type: 'featureService' },
      },
      {
        source: { name: 'test-item', type: 'entity' },
        target: { name: 'data-source-1', type: 'dataSource' },
      },
    ],
    'another-item': [
      {
        source: { name: 'another-item', type: 'entity' },
        target: { name: 'feature-view-2', type: 'featureView' },
      },
    ],
  };

  it('should filter relationships by target type', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'test-item', 'featureView');
    expect(result).toHaveLength(1);
    expect(result[0].target.name).toBe('feature-view-1');
    expect(result[0].target.type).toBe('featureView');
  });

  it('should return empty array when no relationships exist for item', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'nonexistent', 'featureView');
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no relationships match target type', () => {
    const result = getRelationshipsByTargetType(mockRelationships, 'test-item', 'nonexistentType');
    expect(result).toHaveLength(0);
  });

  it('should handle multiple relationships of same type', () => {
    const relationshipsWithMultiple: Record<string, MockRelationship[]> = {
      'test-item': [
        {
          source: { name: 'test-item', type: 'entity' },
          target: { name: 'feature-view-1', type: 'featureView' },
        },
        {
          source: { name: 'test-item', type: 'entity' },
          target: { name: 'feature-view-2', type: 'featureView' },
        },
      ],
    };

    const result = getRelationshipsByTargetType(
      relationshipsWithMultiple,
      'test-item',
      'featureView',
    );
    expect(result).toHaveLength(2);
    expect(result[0].target.name).toBe('feature-view-1');
    expect(result[1].target.name).toBe('feature-view-2');
  });

  it('should handle undefined relationships for item', () => {
    const relationshipsWithUndefined: Record<string, MockRelationship[] | undefined> = {
      'test-item': undefined,
    };

    const result = getRelationshipsByTargetType(
      relationshipsWithUndefined,
      'test-item',
      'featureView',
    );
    expect(result).toHaveLength(0);
  });
});

describe('FeatureStoreFilterUtils', () => {
  const mockFilterKeyMapping = {
    name: 'spec.name',
    owner: 'spec.owner',
    project: 'project',
    tags: 'spec.tags',
    featureViews: 'featureViews',
    created: 'meta.createdTimestamp',
    updated: 'meta.lastUpdatedTimestamp',
  };

  const mockItems: MockFilterableItem[] = [
    {
      spec: {
        name: 'item-1',
        owner: 'team-a',
        tags: { environment: 'production', team: 'ml' },
      },
      project: 'project-a',
      meta: {
        createdTimestamp: '2023-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2023-01-01T00:00:00Z',
      },
    },
    {
      spec: {
        name: 'item-2',
        owner: 'team-b',
        tags: { environment: 'staging', team: 'data' },
      },
      project: 'project-b',
      meta: {
        createdTimestamp: '2023-01-02T00:00:00Z',
        lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
      },
    },
  ];

  const mockRelationships: Record<string, MockRelationship[]> = {
    'item-1': [
      {
        source: { name: 'item-1', type: 'entity' },
        target: { name: 'feature-view-1', type: 'featureView' },
      },
    ],
    'item-2': [
      {
        source: { name: 'item-2', type: 'entity' },
        target: { name: 'feature-view-2', type: 'featureView' },
      },
    ],
  };

  let filterUtils: FeatureStoreFilterUtils<MockFilterableItem, MockRelationship>;

  beforeEach(() => {
    filterUtils = new FeatureStoreFilterUtils(mockFilterKeyMapping);
  });

  describe('applyFilters', () => {
    it('should return all items when no filters applied', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {});
      expect(result).toHaveLength(2);
    });

    it('should filter by name', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: 'item-1',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should filter by owner', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        owner: 'team-a',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.owner).toBe('team-a');
    });

    it('should filter by project', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        project: 'project-a',
      });
      expect(result).toHaveLength(1);
      expect(result[0].project).toBe('project-a');
    });

    it('should filter by tags (key)', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        tags: 'environment',
      });
      expect(result).toHaveLength(2); // Both items have 'environment' tag key
    });

    it('should filter by tags (value)', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        tags: 'production',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should filter by exact tag match (key=value format)', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        tags: 'environment=production',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should filter by tag prefix (key=)', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        tags: 'environment=',
      });
      expect(result).toHaveLength(2); // Both items have 'environment' tag
    });

    it('should filter by tag partial match (key=partial_value)', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        tags: 'team=ml',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should filter by feature views', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        featureViews: 'feature-view-1',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should apply multiple filters', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: 'item-1',
        owner: 'team-a',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should return empty array when no items match filters', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: 'nonexistent',
      });
      expect(result).toHaveLength(0);
    });

    it('should handle case-insensitive filtering', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: 'ITEM-1',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should handle filter with object value', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: { label: 'Item 1', value: 'item-1' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should ignore unknown filter keys', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        unknownKey: 'value',
      });
      expect(result).toHaveLength(2);
    });

    it('should handle items with missing optional properties', () => {
      const itemsWithMissingProps: MockFilterableItem[] = [
        {
          spec: {
            name: 'test',
            tags: {},
          },
        },
      ];

      const result = filterUtils.applyFilters(
        itemsWithMissingProps,
        {},
        {
          name: 'test',
        },
      );
      expect(result).toHaveLength(1);
    });

    it('should handle empty relationships object', () => {
      const result = filterUtils.applyFilters(
        mockItems,
        {},
        {
          featureViews: 'feature-view-1',
        },
      );
      expect(result).toHaveLength(0);
    });

    it('should handle items with non-string tags', () => {
      const itemsWithNonStringTags: MockFilterableItem[] = [
        {
          spec: {
            name: 'test',
            tags: null as unknown as Record<string, string>,
          },
        },
      ];

      const result = filterUtils.applyFilters(
        itemsWithNonStringTags,
        {},
        {
          tags: 'production',
        },
      );
      expect(result).toHaveLength(0);
    });

    it('should handle timestamp filtering', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        created: '2023-01-01',
      });
      expect(result).toHaveLength(2);
      expect(result[0].spec.name).toBe('item-1');
    });

    it('should handle updated timestamp filtering', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        updated: '2023-01-01',
      });
      expect(result).toHaveLength(2);
    });

    it('should handle undefined filter values', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: undefined,
        owner: 'team-a',
      });
      expect(result).toHaveLength(1);
      expect(result[0].spec.owner).toBe('team-a');
    });

    it('should handle empty string filter values', () => {
      const result = filterUtils.applyFilters(mockItems, mockRelationships, {
        name: '',
      });
      expect(result).toHaveLength(2); // Empty string should match all
    });
  });
});

describe('createFeatureStoreFilterUtils', () => {
  const mockFilterKeyMapping = {
    name: 'spec.name',
    owner: 'spec.owner',
  };

  it('should create a FeatureStoreFilterUtils instance', () => {
    const filterUtils = createFeatureStoreFilterUtils<MockFilterableItem, MockRelationship>(
      mockFilterKeyMapping,
    );
    expect(filterUtils).toBeInstanceOf(FeatureStoreFilterUtils);
  });

  it('should create instance with correct filter key mapping', () => {
    const filterUtils = createFeatureStoreFilterUtils<MockFilterableItem, MockRelationship>(
      mockFilterKeyMapping,
    );

    const mockItems: MockFilterableItem[] = [
      {
        spec: {
          name: 'test-item',
          owner: 'test-owner',
        },
      },
    ];

    const result = filterUtils.applyFilters(
      mockItems,
      {},
      {
        name: 'test-item',
      },
    );
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('test-item');
  });
});

describe('applyTagFilters', () => {
  interface TestItem {
    spec: {
      name: string;
      tags?: Record<string, string>;
    };
  }

  const mockItemsWithTags: TestItem[] = [
    {
      spec: {
        name: 'item-1',
        tags: {
          environment: 'production',
          team: 'ml',
          version: 'v1.0',
        },
      },
    },
    {
      spec: {
        name: 'item-2',
        tags: {
          environment: 'staging',
          team: 'data',
          version: 'v2.0',
        },
      },
    },
    {
      spec: {
        name: 'item-3',
        tags: {
          environment: 'production',
          team: 'ml',
          version: 'v1.5',
        },
      },
    },
    {
      spec: {
        name: 'item-4',
        tags: {},
      },
    },
    {
      spec: {
        name: 'item-5',
        tags: undefined,
      },
    },
  ];

  it('should return all items when no tag filters are provided', () => {
    const result = applyTagFilters(mockItemsWithTags, []);
    expect(result).toHaveLength(5);
    expect(result).toEqual(mockItemsWithTags);
  });

  it('should return all items when tagFilters array is empty', () => {
    const result = applyTagFilters(mockItemsWithTags, []);
    expect(result).toHaveLength(5);
  });

  it('should filter by single tag filter', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=production']);
    expect(result).toHaveLength(2);
    expect(result[0].spec.name).toBe('item-1');
    expect(result[1].spec.name).toBe('item-3');
  });

  it('should filter by multiple tag filters (AND logic)', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=production', 'team=ml']);
    expect(result).toHaveLength(2);
    expect(result[0].spec.name).toBe('item-1');
    expect(result[1].spec.name).toBe('item-3');
  });

  it('should return empty array when no items match all tag filters', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=production', 'team=data']);
    expect(result).toHaveLength(0);
  });

  it('should handle items with empty tags object', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=production']);
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.spec.name !== 'item-4')).toBe(true);
  });

  it('should handle items with undefined tags', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=production']);
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.spec.name !== 'item-5')).toBe(true);
  });

  it('should handle case-sensitive tag matching', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment=Production']);
    expect(result).toHaveLength(0);
  });

  it('should handle tag filters with spaces', () => {
    const itemsWithSpaces = [
      {
        spec: {
          name: 'item-with-spaces',
          tags: {
            'team name': 'ml team',
            'environment type': 'production',
          },
        },
      },
    ];

    const result = applyTagFilters(itemsWithSpaces, ['team name=ml team']);
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('item-with-spaces');
  });

  it('should handle special characters in tag keys and values', () => {
    const itemsWithSpecialChars = [
      {
        spec: {
          name: 'item-special',
          tags: {
            'team-name': 'ml-team',
            'env.type': 'prod-env',
          },
        },
      },
    ];

    const result = applyTagFilters(itemsWithSpecialChars, [
      'team-name=ml-team',
      'env.type=prod-env',
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('item-special');
  });

  it('should handle numeric values in tags', () => {
    const itemsWithNumericTags = [
      {
        spec: {
          name: 'item-numeric',
          tags: {
            version: '1.0',
            build: '123',
            priority: '5',
          },
        },
      },
    ];

    const result = applyTagFilters(itemsWithNumericTags, ['version=1.0', 'build=123']);
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('item-numeric');
  });

  it('should handle empty string values in tags', () => {
    const itemsWithEmptyValues = [
      {
        spec: {
          name: 'item-empty',
          tags: {
            status: '',
            description: 'test',
          },
        },
      },
    ];

    const result = applyTagFilters(itemsWithEmptyValues, ['status=']);
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('item-empty');
  });

  it('should handle malformed tag filter strings', () => {
    const result = applyTagFilters(mockItemsWithTags, ['invalid-tag-filter']);
    expect(result).toHaveLength(0);
  });

  it('should handle tag filter with only key (no equals sign)', () => {
    const result = applyTagFilters(mockItemsWithTags, ['environment']);
    expect(result).toHaveLength(0);
  });

  it('should handle tag filter with only equals sign', () => {
    const result = applyTagFilters(mockItemsWithTags, ['=']);
    expect(result).toHaveLength(0);
  });

  it('should work with different entity types (DataSets, Entities, FeatureViews, FeatureServices)', () => {
    const dataSet = {
      spec: {
        name: 'test-dataset',
        tags: { environment: 'production', team: 'ml' },
      },
    };

    const entity = {
      spec: {
        name: 'test-entity',
        tags: { environment: 'staging', team: 'data' },
      },
    };

    const featureView = {
      spec: {
        name: 'test-feature-view',
        tags: { environment: 'production', team: 'ml' },
      },
    };

    const featureService = {
      spec: {
        name: 'test-feature-service',
        tags: { environment: 'production', team: 'ml' },
      },
    };

    const items = [dataSet, entity, featureView, featureService];

    const result = applyTagFilters(items, ['environment=production', 'team=ml']);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.spec.name)).toEqual([
      'test-dataset',
      'test-feature-view',
      'test-feature-service',
    ]);
  });

  it('should preserve original item structure', () => {
    const originalItem = {
      spec: {
        name: 'test-item',
        tags: { environment: 'production' },
        otherProperty: 'other-value',
      },
      meta: {
        created: '2023-01-01',
      },
    };

    const result = applyTagFilters([originalItem], ['environment=production']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(originalItem);
    expect(result[0].spec.otherProperty).toBe('other-value');
    expect(result[0].meta.created).toBe('2023-01-01');
  });

  it('should handle large number of tag filters efficiently', () => {
    const itemWithManyTags = {
      spec: {
        name: 'item-many-tags',
        tags: {
          tag1: 'value1',
          tag2: 'value2',
          tag3: 'value3',
          tag4: 'value4',
          tag5: 'value5',
        },
      },
    };

    const manyTagFilters = [
      'tag1=value1',
      'tag2=value2',
      'tag3=value3',
      'tag4=value4',
      'tag5=value5',
    ];

    const result = applyTagFilters([itemWithManyTags], manyTagFilters);
    expect(result).toHaveLength(1);
    expect(result[0].spec.name).toBe('item-many-tags');
  });

  it('should handle items with no spec.tags property gracefully', () => {
    const itemWithoutTags: TestItem = {
      spec: {
        name: 'item-no-tags',
      },
    };

    const result = applyTagFilters([itemWithoutTags], ['environment=production']);
    expect(result).toHaveLength(0);
  });
});
