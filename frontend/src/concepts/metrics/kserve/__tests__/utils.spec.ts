import { KserveMetricsGraphTypes } from '~/concepts/metrics/kserve/const';
import {
  isKserveMetricsConfigMapKind,
  isValidKserveMetricsDataObject,
} from '~/concepts/metrics/kserve/utils';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';

describe('isKserveMetricsConfigMapKind', () => {
  it('should return true when given a valid value', () => {
    const configMap1 = mockConfigMap({
      data: {
        supported: 'true',
        metrics: '{}',
      },
    });

    const configMap2 = mockConfigMap({
      data: {
        supported: 'false',
      },
    });

    const configMap3 = mockConfigMap({
      data: {
        supported: 'false',
        unknownExtraProp: 'hello',
      },
    });

    expect(isKserveMetricsConfigMapKind(configMap1)).toBe(true);
    expect(isKserveMetricsConfigMapKind(configMap2)).toBe(true);
    expect(isKserveMetricsConfigMapKind(configMap3)).toBe(true);
  });

  it('should return false when given an invalid value', () => {
    const configMap1 = mockConfigMap({
      data: {
        supported: 'true',
      },
    });

    const configMap2 = mockConfigMap({
      data: {
        supported: 'no sir!',
      },
    });

    expect(isKserveMetricsConfigMapKind(configMap1)).toBe(false);
    expect(isKserveMetricsConfigMapKind(configMap2)).toBe(false);
  });

  it('should return false when given an insane value', () => {
    const configMap1 = mockConfigMap({ data: undefined });
    expect(isKserveMetricsConfigMapKind(configMap1)).toBe(false);
  });
});

describe('isValidKserveMetricsDataObject', () => {
  it('should return true when given a valid value', () => {
    expect(
      isValidKserveMetricsDataObject({
        config: [
          {
            title: 'Requests',
            type: KserveMetricsGraphTypes.MEAN_LATENCY,
            queries: [
              {
                title: 'success',
                query: 'prometheus query',
              },
              {
                title: 'failed',
                query: 'prometheus query',
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it('should return false when given an invalid value', () => {
    expect(
      isValidKserveMetricsDataObject({
        cats: [
          {
            title: 'Requests',
            type: KserveMetricsGraphTypes.MEAN_LATENCY,
            queries: [
              {
                title: 'success',
                query: 'prometheus query',
              },
              {
                title: 'failed',
                query: 'prometheus query',
              },
            ],
          },
        ],
      }),
    ).toBe(false);

    expect(
      isValidKserveMetricsDataObject({
        config: [],
      }),
    ).toBe(false);
  });

  it('should return false when given an insane value', () => {
    expect(isValidKserveMetricsDataObject(null)).toBe(false);
    expect(isValidKserveMetricsDataObject(undefined)).toBe(false);
    expect(isValidKserveMetricsDataObject({})).toBe(false);
    expect(isValidKserveMetricsDataObject([])).toBe(false);
    expect(isValidKserveMetricsDataObject(true)).toBe(false);
    expect(isValidKserveMetricsDataObject(false)).toBe(false);
    expect(isValidKserveMetricsDataObject(1)).toBe(false);
  });
});
