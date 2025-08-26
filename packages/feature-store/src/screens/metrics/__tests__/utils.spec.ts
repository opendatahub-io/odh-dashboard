import { processMetricsData, formatResourceType, getResourceRoute } from '../utils';
import { MetricsCountResponse } from '../../../types/metrics';

jest.mock('../../../routes', () => ({
  featureEntityRoute: jest.fn((name, project) => `/featureStore/entities/${project}/${name}`),
  featureRoute: jest.fn((name, project) => `/featureStore/features/${project}/${name}`),
  featureServiceRoute: jest.fn(
    (name, project) => `/featureStore/featureServices/${project}/${name}`,
  ),
  featureViewRoute: jest.fn((name, project) => `/featureStore/featureViews/${project}/${name}`),
}));

describe('utils', () => {
  describe('processMetricsData', () => {
    it('should process data with project and counts', () => {
      const mockData: MetricsCountResponse = {
        project: 'test-project',
        counts: {
          entities: 5,
          dataSources: 3,
          savedDatasets: 2,
          features: 10,
          featureViews: 4,
          featureServices: 1,
        },
      };

      const result = processMetricsData(mockData);

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({
        title: 'Entities',
        count: 5,
        description:
          'Entities are collections of related features and can be mapped to the domain of your use case.',
        route: '/featureStore/entities',
      });
      expect(result[1]).toEqual({
        title: 'Data sources',
        count: 3,
        description:
          'Data sources such as tables or data warehouses contain the raw data from which features are extracted.',
        route: '/featureStore/dataSources',
      });
      expect(result[2]).toEqual({
        title: 'Datasets',
        count: 2,
        description:
          'Datasets are point-in-time-correct snapshots of feature data used for training or validation.',
        route: '/featureStore/savedDatasets',
      });
      expect(result[3]).toEqual({
        title: 'Features',
        count: 10,
        description: 'A feature is a single data value used in model training or inference.',
        route: '/featureStore/features',
      });
      expect(result[4]).toEqual({
        title: 'Feature views',
        count: 4,
        description:
          'A feature view is a logical group of time-series feature data as it is found in a data source.',
        route: '/featureStore/featureViews',
      });
      expect(result[5]).toEqual({
        title: 'Feature services',
        count: 1,
        description:
          'A feature service is a logical group of features from one or more feature views.',
        route: '/featureStore/featureServices',
      });
    });

    it('should process data with total counts', () => {
      const mockData: MetricsCountResponse = {
        total: {
          entities: 10,
          dataSources: 6,
          savedDatasets: 4,
          features: 20,
          featureViews: 8,
          featureServices: 2,
        },
      };

      const result = processMetricsData(mockData);

      expect(result).toHaveLength(6);
      expect(result[0].count).toBe(10);
      expect(result[1].count).toBe(6);
      expect(result[2].count).toBe(4);
      expect(result[3].count).toBe(20);
      expect(result[4].count).toBe(8);
      expect(result[5].count).toBe(2);
    });

    it('should return zero counts when no data is provided', () => {
      const mockData: MetricsCountResponse = {};

      const result = processMetricsData(mockData);

      expect(result).toHaveLength(6);
      result.forEach((item) => {
        expect(item.count).toBe(0);
      });
    });

    it('should return zero counts when data has empty counts', () => {
      const mockData: MetricsCountResponse = {
        project: 'test-project',
        counts: {
          entities: 0,
          dataSources: 0,
          savedDatasets: 0,
          features: 0,
          featureViews: 0,
          featureServices: 0,
        },
      };

      const result = processMetricsData(mockData);

      expect(result).toHaveLength(6);
      result.forEach((item) => {
        expect(item.count).toBe(0);
      });
    });

    it('should prioritize project counts over total counts', () => {
      const mockData: MetricsCountResponse = {
        project: 'test-project',
        counts: {
          entities: 5,
          dataSources: 3,
          savedDatasets: 2,
          features: 10,
          featureViews: 4,
          featureServices: 1,
        },
        total: {
          entities: 100,
          dataSources: 50,
          savedDatasets: 25,
          features: 200,
          featureViews: 75,
          featureServices: 10,
        },
      };

      const result = processMetricsData(mockData);

      expect(result[0].count).toBe(5);
      expect(result[1].count).toBe(3);
      expect(result[2].count).toBe(2);
      expect(result[3].count).toBe(10);
      expect(result[4].count).toBe(4);
      expect(result[5].count).toBe(1);
    });
  });

  describe('formatResourceType', () => {
    it('should format known resource types', () => {
      expect(formatResourceType('entities')).toBe('entity');
      expect(formatResourceType('feature_views')).toBe('feature views');
      expect(formatResourceType('saved_datasets')).toBe('saved datasets');
      expect(formatResourceType('feature_services')).toBe('feature services');
      expect(formatResourceType('features')).toBe('features');
    });

    it('should return original string for unknown resource types', () => {
      expect(formatResourceType('unknown_type')).toBe('unknown_type');
      expect(formatResourceType('custom_resource')).toBe('custom_resource');
      expect(formatResourceType('')).toBe('');
    });

    it('should handle edge cases', () => {
      expect(formatResourceType('entities')).toBe('entity');
      expect(formatResourceType('data_sources')).toBe('data sources');
    });
  });

  describe('getResourceRoute', () => {
    const mockProject = 'test-project';
    const mockResourceName = 'test-resource';

    it('should return correct route for feature views', () => {
      const result = getResourceRoute('feature views', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/featureViews/${mockProject}/${mockResourceName}`);
    });

    it('should return correct route for entities', () => {
      const result = getResourceRoute('entity', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/entities/${mockProject}/${mockResourceName}`);
    });

    it('should return correct route for feature services', () => {
      const result = getResourceRoute('feature services', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/featureServices/${mockProject}/${mockResourceName}`);
    });

    it('should return correct route for saved datasets', () => {
      const result = getResourceRoute('saved datasets', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/savedDatasets/${mockResourceName}?project=${mockProject}`);
    });

    it('should return correct route for data sources', () => {
      const result = getResourceRoute('data sources', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/dataSources/${mockResourceName}?project=${mockProject}`);
    });

    it('should return correct route for features', () => {
      const result = getResourceRoute('features', mockResourceName, mockProject);
      expect(result).toBe(`/featureStore/features/${mockProject}/${mockResourceName}`);
    });

    it('should return default route for unknown resource types', () => {
      const result = getResourceRoute('unknown_type', mockResourceName, mockProject);
      expect(result).toBe('#');
    });

    it('should handle empty resource name', () => {
      const result = getResourceRoute('entity', '', mockProject);
      expect(result).toBe(`/featureStore/entities/${mockProject}/`);
    });

    it('should handle special characters in resource name and project', () => {
      const specialResourceName = 'test-resource-with-special-chars_123';
      const specialProject = 'test-project-with-special-chars_456';

      const result = getResourceRoute('entity', specialResourceName, specialProject);
      expect(result).toBe(`/featureStore/entities/${specialProject}/${specialResourceName}`);
    });

    it('should handle all resource type mappings', () => {
      const testCases = [
        {
          resourceType: 'entity',
          expectedRoute: `/featureStore/entities/${mockProject}/${mockResourceName}`,
        },
        {
          resourceType: 'feature views',
          expectedRoute: `/featureStore/featureViews/${mockProject}/${mockResourceName}`,
        },
        {
          resourceType: 'saved datasets',
          expectedRoute: `/featureStore/savedDatasets/${mockResourceName}?project=${mockProject}`,
        },
        {
          resourceType: 'data sources',
          expectedRoute: `/featureStore/dataSources/${mockResourceName}?project=${mockProject}`,
        },
        {
          resourceType: 'feature services',
          expectedRoute: `/featureStore/featureServices/${mockProject}/${mockResourceName}`,
        },
        {
          resourceType: 'features',
          expectedRoute: `/featureStore/features/${mockProject}/${mockResourceName}`,
        },
      ];

      testCases.forEach(({ resourceType, expectedRoute }) => {
        const result = getResourceRoute(resourceType, mockResourceName, mockProject);
        expect(result).toBe(expectedRoute);
      });
    });
  });
});
