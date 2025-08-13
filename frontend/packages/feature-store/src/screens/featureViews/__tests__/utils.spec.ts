import { FeatureView, OnDemandFeatureViewSources } from '../../../types/featureView';
import {
  applyFeatureViewFilters,
  countRelationshipTypes,
  getFeatureViewType,
  getRelationshipsByTargetType,
  formatFeatureViewDataSources,
  formatOnDemandFeatureViewSources,
  getSchemaItemValue,
  getSchemaItemLink,
} from '../utils';
import { SchemaItem } from '../featureViewDetails/FeatureViewSchemaTable';

describe('Feature View Utils', () => {
  describe('applyFeatureViewFilters', () => {
    const mockFeatureViews: FeatureView[] = [
      {
        type: 'featureView',
        spec: {
          name: 'test-feature-view',
          tags: ['tag1', 'tag2'],
          owner: 'test-owner',
        },
        project: 'test-project',
        relationships: {},
        meta: {},
      } as unknown as FeatureView,
      {
        type: 'onDemandFeatureView',
        spec: {
          name: 'another-feature-view',
          tags: ['tag3'],
          owner: 'another-owner',
        },
        project: 'another-project',
        relationships: {},
        meta: {},
      } as unknown as FeatureView,
    ];

    const mockRelationships = {};

    it('should filter by feature view name', () => {
      const filters = { 'Feature view': 'test' };
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, filters);
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('test-feature-view');
    });

    it('should filter by project', () => {
      const filters = { Project: 'test-project' };
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, filters);
      expect(result).toHaveLength(1);
      expect(result[0].project).toBe('test-project');
    });

    it('should filter by tags', () => {
      const filters = { Tags: 'tag1' };
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, filters);
      expect(result).toHaveLength(1);
      expect(result[0].spec.tags).toContain('tag1');
    });

    it('should filter by owner', () => {
      const filters = { Owner: 'test-owner' };
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, filters);
      expect(result).toHaveLength(1);
      expect(result[0].spec.owner).toBe('test-owner');
    });

    it('should return all items when no filters applied', () => {
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, {});
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no matches found', () => {
      const filters = { 'Feature view': 'nonexistent' };
      const result = applyFeatureViewFilters(mockFeatureViews, mockRelationships, filters);
      expect(result).toHaveLength(0);
    });

    it('should filter by store type (online)', () => {
      const mockFeatureViewsWithStoreType: FeatureView[] = [
        {
          type: 'featureView',
          spec: {
            name: 'online-feature-view',
            online: true,
            offline: false,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
        {
          type: 'featureView',
          spec: {
            name: 'offline-feature-view',
            online: false,
            offline: true,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
        {
          type: 'featureView',
          spec: {
            name: 'both-feature-view',
            online: true,
            offline: true,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
        {
          type: 'featureView',
          spec: {
            name: 'neither-feature-view',
            online: false,
            offline: false,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
      ];

      const filters = { 'Store type': 'online' };
      const result = applyFeatureViewFilters(
        mockFeatureViewsWithStoreType,
        mockRelationships,
        filters,
      );
      expect(result).toHaveLength(2); // online-feature-view and both-feature-view
      expect(result.map((fv) => fv.spec.name)).toContain('online-feature-view');
      expect(result.map((fv) => fv.spec.name)).toContain('both-feature-view');
    });

    it('should filter by store type (offline)', () => {
      const mockFeatureViewsWithStoreType: FeatureView[] = [
        {
          type: 'featureView',
          spec: {
            name: 'online-feature-view',
            online: true,
            offline: false,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
        {
          type: 'featureView',
          spec: {
            name: 'offline-feature-view',
            online: false,
            offline: true,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
      ];

      const filters = { 'Store type': 'offline' };
      const result = applyFeatureViewFilters(
        mockFeatureViewsWithStoreType,
        mockRelationships,
        filters,
      );
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('offline-feature-view');
    });

    it('should filter by store type (dash for neither)', () => {
      const mockFeatureViewsWithStoreType: FeatureView[] = [
        {
          type: 'featureView',
          spec: {
            name: 'online-feature-view',
            online: true,
            offline: false,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
        {
          type: 'featureView',
          spec: {
            name: 'neither-feature-view',
            online: false,
            offline: false,
          },
          project: 'test-project',
          relationships: {},
          meta: {},
        } as unknown as FeatureView,
      ];

      const filters = { 'Store type': '-' };
      const result = applyFeatureViewFilters(
        mockFeatureViewsWithStoreType,
        mockRelationships,
        filters,
      );
      expect(result).toHaveLength(1);
      expect(result[0].spec.name).toBe('neither-feature-view');
    });
  });

  describe('countRelationshipTypes', () => {
    const mockRelationships = [
      { source: { type: 'feature', name: 'f1' }, target: { type: 'dataSource', name: 'ds1' } },
      { source: { type: 'feature', name: 'f2' }, target: { type: 'featureService', name: 'fs1' } },
      { source: { type: 'dataSource', name: 'ds2' }, target: { type: 'feature', name: 'f3' } },
    ];

    it('should count relationship types correctly', () => {
      const types = ['feature', 'dataSource', 'featureService'];
      const result = countRelationshipTypes(mockRelationships, types);
      expect(result).toEqual({
        feature: 3,
        dataSource: 2,
        featureService: 1,
      });
    });

    it('should return zero counts for types not found', () => {
      const types = ['nonexistent', 'another'];
      const result = countRelationshipTypes(mockRelationships, types);
      expect(result).toEqual({
        nonexistent: 0,
        another: 0,
      });
    });

    it('should handle empty relationships array', () => {
      const types = ['feature', 'dataSource'];
      const result = countRelationshipTypes([], types);
      expect(result).toEqual({
        feature: 0,
        dataSource: 0,
      });
    });

    it('should handle empty types array', () => {
      const result = countRelationshipTypes(mockRelationships, []);
      expect(result).toEqual({});
    });
  });

  describe('getFeatureViewType', () => {
    it('should return "Batch" for featureView type', () => {
      const result = getFeatureViewType('featureView');
      expect(result).toBe('Batch');
    });

    it('should return "On demand" for onDemandFeatureView type', () => {
      const result = getFeatureViewType('onDemandFeatureView');
      expect(result).toBe('On demand');
    });

    it('should return undefined for unknown type', () => {
      const result = getFeatureViewType('unknownType' as FeatureView['type']);
      expect(result).toBeUndefined();
    });
  });

  describe('getRelationshipsByTargetType', () => {
    const mockRelationshipsArray = [
      { source: { type: 'feature', name: 'f1' }, target: { type: 'featureService', name: 'fs1' } },
      { source: { type: 'dataSource', name: 'ds1' }, target: { type: 'featureView', name: 'fv1' } },
      { source: { type: 'feature', name: 'f2' }, target: { type: 'featureService', name: 'fs2' } },
    ];

    const mockRelationshipsRecord = {
      driver: [
        {
          source: { type: 'feature', name: 'f1' },
          target: { type: 'featureService', name: 'fs1' },
        },
        {
          source: { type: 'dataSource', name: 'ds1' },
          target: { type: 'featureView', name: 'fv1' },
        },
      ],
      zipcode: [
        {
          source: { type: 'feature', name: 'f2' },
          target: { type: 'featureService', name: 'fs2' },
        },
      ],
    };

    it('should filter relationships by target type from array', () => {
      const result = getRelationshipsByTargetType(mockRelationshipsArray, 'any', 'featureService');
      expect(result).toHaveLength(2);
      expect(result[0].target.type).toBe('featureService');
      expect(result[1].target.type).toBe('featureService');
    });

    it('should filter relationships by target type from record', () => {
      const result = getRelationshipsByTargetType(
        mockRelationshipsRecord,
        'driver',
        'featureService',
      );
      expect(result).toHaveLength(1);
      expect(result[0].target.type).toBe('featureService');
    });

    it('should filter relationships by source type', () => {
      const result = getRelationshipsByTargetType(
        mockRelationshipsArray,
        'any',
        'feature',
        'source',
      );
      expect(result).toHaveLength(2);
      expect(result[0].source.type).toBe('feature');
      expect(result[1].source.type).toBe('feature');
    });

    it('should return empty array when no matches found', () => {
      const result = getRelationshipsByTargetType(mockRelationshipsArray, 'any', 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent entity key', () => {
      const result = getRelationshipsByTargetType(
        mockRelationshipsRecord,
        'nonexistent',
        'featureService',
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('formatFeatureViewDataSources', () => {
    it('should format batch feature view data sources', () => {
      const mockFeatureView: FeatureView = {
        type: 'featureView',
        spec: {
          name: 'test-feature-view',
          batchSource: {
            name: 'test-batch-source',
            fileOptions: {
              uri: 'file://test/path',
            },
            meta: {
              createdTimestamp: '2023-01-01T00:00:00Z',
              lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
            },
          },
        },
      } as FeatureView;

      const result = formatFeatureViewDataSources(mockFeatureView);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceType: 'Batch',
        name: 'test-batch-source',
        fileUrl: 'file://test/path',
        createdDate: '2023-01-01T00:00:00Z',
        lastModifiedDate: '2023-01-02T00:00:00Z',
      });
    });

    it('should format stream feature view data sources', () => {
      const mockFeatureView: FeatureView = {
        type: 'featureView',
        spec: {
          name: 'test-feature-view',
          streamSource: {
            name: 'test-stream-source',
            meta: {
              createdTimestamp: '2023-01-01T00:00:00Z',
              lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
            },
          },
        },
      } as FeatureView;

      const result = formatFeatureViewDataSources(mockFeatureView);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceType: 'Stream',
        name: 'test-stream-source',
        fileUrl: '-',
        createdDate: '2023-01-01T00:00:00Z',
        lastModifiedDate: '2023-01-02T00:00:00Z',
      });
    });

    it('should format on-demand feature view data sources', () => {
      const mockFeatureView: FeatureView = {
        type: 'onDemandFeatureView',
        spec: {
          name: 'test-feature-view',
          sources: {
            source1: {
              requestDataSource: {
                name: 'test-request-source',
                meta: {
                  createdTimestamp: '2023-01-01T00:00:00Z',
                  lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
                },
              },
              featureViewProjection: {
                name: 'test-projection',
                batchSource: {
                  name: 'test-projection-batch',
                  fileOptions: {
                    uri: 'file://test/projection/path',
                  },
                  meta: {
                    createdTimestamp: '2023-01-03T00:00:00Z',
                    lastUpdatedTimestamp: '2023-01-04T00:00:00Z',
                  },
                },
              },
            },
          },
        },
        relationships: {},
        meta: {},
      } as unknown as FeatureView;

      const result = formatFeatureViewDataSources(mockFeatureView);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sourceType: 'On-Demand',
        name: 'test-request-source',
        fileUrl: '-',
        createdDate: '2023-01-01T00:00:00Z',
        lastModifiedDate: '2023-01-02T00:00:00Z',
      });
      expect(result[1]).toEqual({
        sourceType: 'Projection',
        name: 'test-projection-batch',
        fileUrl: 'file://test/projection/path',
        createdDate: '2023-01-03T00:00:00Z',
        lastModifiedDate: '2023-01-04T00:00:00Z',
      });
    });

    it('should handle missing optional fields', () => {
      const mockFeatureView: FeatureView = {
        type: 'featureView',
        spec: {
          name: 'test-feature-view',
          batchSource: {
            fileOptions: {
              uri: 'file://test/path',
            },
          },
        },
      } as FeatureView;

      const result = formatFeatureViewDataSources(mockFeatureView);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sourceType: 'Batch',
        name: '-',
        fileUrl: 'file://test/path',
        createdDate: '-',
        lastModifiedDate: '-',
      });
    });

    it('should return empty array for unknown feature view type', () => {
      const mockFeatureView: FeatureView = {
        type: 'unknownType' as FeatureView['type'],
        spec: {
          name: 'test-feature-view',
        },
      } as unknown as FeatureView;

      const result = formatFeatureViewDataSources(mockFeatureView);
      expect(result).toHaveLength(0);
    });
  });

  describe('formatOnDemandFeatureViewSources', () => {
    const mockSources = {
      source1: {
        requestDataSource: {
          name: 'test-request-source',
          requestDataOptions: {
            schema: [
              {
                name: 'column1',
                valueType: 'string',
                description: 'Test column',
                tags: { tag1: 'value1' },
              },
            ],
          },
        },
      },
      source2: {
        featureViewProjection: {
          name: 'test-projection',
          featureColumns: [
            {
              name: 'feature1',
              valueType: 'number',
              description: 'Test feature',
              tags: { tag2: 'value2' },
            },
          ],
          batchSource: {
            name: 'test-batch-source',
            fileOptions: {
              uri: 'file://test/path',
            },
            meta: {
              createdTimestamp: '2023-01-01T00:00:00Z',
              lastUpdatedTimestamp: '2023-01-02T00:00:00Z',
            },
          },
        },
      },
    } as unknown as OnDemandFeatureViewSources;

    it('should format on-demand feature view sources correctly', () => {
      const result = formatOnDemandFeatureViewSources(mockSources);
      expect(result).toHaveLength(2);

      // Check requestDataSource
      expect(result[0]).toEqual({
        sourceKey: 'source1',
        sourceType: 'requestDataSource',
        name: 'test-request-source',
        description: undefined,
        schema: [
          {
            name: 'column1',
            valueType: 'string',
            description: 'Test column',
            tags: { tag1: 'value1' },
          },
        ],
      });

      // Check featureViewProjection
      expect(result[1]).toEqual({
        sourceKey: 'source2',
        sourceType: 'featureViewProjection',
        name: 'test-projection',
        description: undefined,
        features: [
          {
            name: 'feature1',
            valueType: 'number',
            description: 'Test feature',
            tags: { tag2: 'value2' },
          },
        ],
        batchSource: {
          name: 'test-batch-source',
          fileUrl: 'file://test/path',
          createdDate: '2023-01-01T00:00:00Z',
          lastModifiedDate: '2023-01-02T00:00:00Z',
        },
      });
    });

    it('should handle sources with missing optional fields', () => {
      const mockSourcesWithMissingFields = {
        source1: {
          requestDataSource: {
            requestDataOptions: {
              schema: [],
            },
          },
        },
        source2: {
          featureViewProjection: {
            featureColumns: [],
          },
        },
      } as unknown as OnDemandFeatureViewSources;

      const result = formatOnDemandFeatureViewSources(mockSourcesWithMissingFields);
      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        sourceKey: 'source1',
        sourceType: 'requestDataSource',
        name: 'source1',
        description: undefined,
        schema: [],
      });

      expect(result[1]).toEqual({
        sourceKey: 'source2',
        sourceType: 'featureViewProjection',
        name: 'source2',
        description: undefined,
        features: [],
        batchSource: undefined,
      });
    });

    it('should handle empty sources object', () => {
      const result = formatOnDemandFeatureViewSources({});
      expect(result).toHaveLength(0);
    });
  });

  describe('getSchemaItemValue', () => {
    const mockSchemaItem: SchemaItem = {
      column: 'test-column',
      type: 'test-type',
      dataType: 'test-data-type',
      description: 'test-description',
    };

    it('should return column value', () => {
      const result = getSchemaItemValue(mockSchemaItem, 'column');
      expect(result).toBe('test-column');
    });

    it('should return type value', () => {
      const result = getSchemaItemValue(mockSchemaItem, 'type');
      expect(result).toBe('test-type');
    });

    it('should return dataType value', () => {
      const result = getSchemaItemValue(mockSchemaItem, 'dataType');
      expect(result).toBe('test-data-type');
    });

    it('should return description value', () => {
      const result = getSchemaItemValue(mockSchemaItem, 'description');
      expect(result).toBe('test-description');
    });

    it('should return empty string for unknown key', () => {
      const result = getSchemaItemValue(mockSchemaItem, 'unknown');
      expect(result).toBe('');
    });
  });

  describe('getSchemaItemLink for transform schema items', () => {
    const mockFeatureView: FeatureView = {
      type: 'featureView',
      spec: {
        name: 'test-feature-view',
        online: true,
        offline: false,
      },
      project: 'test-project',
      relationships: {},
      meta: {},
    } as unknown as FeatureView;

    const mockEntityItem: SchemaItem = {
      column: 'test-entity',
      type: 'ENTITY',
      dataType: 'STRING',
      description: 'Test entity',
    };

    const mockFeatureItem: SchemaItem = {
      column: 'test-feature',
      type: 'FEATURE',
      dataType: 'INT64',
      description: 'Test feature',
    };

    it('should return entity route for entity items', () => {
      const result = getSchemaItemLink(mockEntityItem, mockFeatureView, 'test-project');
      expect(result).toBe('/featureStore/entities/test-project/test-entity');
    });

    it('should return feature route for feature items', () => {
      const result = getSchemaItemLink(mockFeatureItem, mockFeatureView, 'test-project');
      expect(result).toBe('/featureStore/features/test-project/test-feature-view/test-feature');
    });

    it('should use featureView.project when currentProject is not provided', () => {
      const result = getSchemaItemLink(mockEntityItem, mockFeatureView);
      expect(result).toBe('/featureStore/entities/test-project/test-entity');
    });

    it('should use currentProject when featureView.project is not available', () => {
      const featureViewWithoutProject = {
        ...mockFeatureView,
        project: undefined,
      } as FeatureView;

      const result = getSchemaItemLink(
        mockEntityItem,
        featureViewWithoutProject,
        'fallback-project',
      );
      expect(result).toBe('/featureStore/entities/fallback-project/test-entity');
    });

    it('should return "#" when no project is available', () => {
      const featureViewWithoutProject = {
        ...mockFeatureView,
        project: undefined,
      } as FeatureView;

      const result = getSchemaItemLink(mockEntityItem, featureViewWithoutProject);
      expect(result).toBe('#');
    });

    it('should return "#" for unknown item types', () => {
      const unknownItem: SchemaItem = {
        column: 'unknown-item',
        type: 'UNKNOWN',
        dataType: 'STRING',
        description: 'Unknown item',
      };

      const result = getSchemaItemLink(unknownItem, mockFeatureView, 'test-project');
      expect(result).toBe('#');
    });

    it('should handle feature items with different feature view names', () => {
      const featureViewWithDifferentName = {
        ...mockFeatureView,
        spec: {
          ...mockFeatureView.spec,
          name: 'different-feature-view',
        },
      } as FeatureView;

      const result = getSchemaItemLink(
        mockFeatureItem,
        featureViewWithDifferentName,
        'test-project',
      );
      expect(result).toBe(
        '/featureStore/features/test-project/different-feature-view/test-feature',
      );
    });
  });
});
