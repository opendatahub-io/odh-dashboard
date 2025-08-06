import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import { countFeatures } from '#~/pages/featureStore/screens/featureServices/featureServiceDetails/utils';

describe('countFeatures', () => {
  it('should return the total count of features from all feature views', () => {
    const mockFeatureService: FeatureService = {
      spec: {
        name: 'test-service',
        features: [
          {
            featureViewName: 'view1',
            featureColumns: [
              { name: 'feature1', valueType: 'STRING' },
              { name: 'feature2', valueType: 'INT64' },
            ],
          },
          {
            featureViewName: 'view2',
            featureColumns: [
              { name: 'feature3', valueType: 'DOUBLE' },
              { name: 'feature4', valueType: 'BOOLEAN' },
              { name: 'feature5', valueType: 'STRING' },
            ],
          },
        ],
      },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    };

    const result = countFeatures(mockFeatureService);
    expect(result).toBe(5);
  });

  it('should return 0 when feature service has no features', () => {
    const mockFeatureService: FeatureService = {
      spec: {
        name: 'test-service',
        features: [],
      },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    };

    const result = countFeatures(mockFeatureService);
    expect(result).toBe(0);
  });

  it('should return undefined when features property is undefined', () => {
    const mockFeatureService: FeatureService = {
      spec: {
        name: 'test-service',
      },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    };

    const result = countFeatures(mockFeatureService);
    expect(result).toBeUndefined();
  });

  it('should handle feature views with empty feature columns', () => {
    const mockFeatureService: FeatureService = {
      spec: {
        name: 'test-service',
        features: [
          {
            featureViewName: 'view1',
            featureColumns: [],
          },
          {
            featureViewName: 'view2',
            featureColumns: [{ name: 'feature1', valueType: 'STRING' }],
          },
        ],
      },
      meta: {
        createdTimestamp: '2025-01-01T00:00:00Z',
        lastUpdatedTimestamp: '2025-01-01T00:00:00Z',
      },
    };

    const result = countFeatures(mockFeatureService);
    expect(result).toBe(1);
  });
});
