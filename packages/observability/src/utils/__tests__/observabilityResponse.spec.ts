import {
  hasSeriesForNamespace,
  isPrometheusQueryPath,
  isPrometheusResponsePath,
  isPrometheusVariablePath,
  parsePrometheusResponseEvidence,
  requestContainsNamespace,
} from '../observabilityResponse';

const unauthorizedSeriesResponse = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: {
          namespace: 'namespace-b',
          model_name: 'not-listed-in-the-ui',
        },
        values: [[1710000000, '1']],
      },
    ],
  },
};

describe('parsePrometheusResponseEvidence', () => {
  it('should identify an unauthorized series outside the UI-checked model names', () => {
    const response = parsePrometheusResponseEvidence(unauthorizedSeriesResponse);

    if (!response) {
      throw new Error('Expected a valid Prometheus response');
    }
    expect(hasSeriesForNamespace(response, 'namespace-b')).toBe(true);
  });

  it('should identify an empty successful response', () => {
    const response = parsePrometheusResponseEvidence({
      status: 'success',
      data: { resultType: 'matrix', result: [] },
    });

    expect(response).toEqual({ hasData: false, series: [] });
  });

  it('should reject malformed response bodies', () => {
    expect(parsePrometheusResponseEvidence('{')).toBeUndefined();
    expect(parsePrometheusResponseEvidence({ status: 'error' })).toEqual({
      hasData: false,
      series: [],
      error: 'Prometheus response error',
    });
    expect(parsePrometheusResponseEvidence({ status: 'pending' })).toBeUndefined();
    expect(parsePrometheusResponseEvidence({ status: 'success', data: {} })).toBeUndefined();
  });

  it('should parse JSON response bodies', () => {
    expect(
      parsePrometheusResponseEvidence(
        JSON.stringify({ status: 'success', data: { resultType: 'matrix', result: [] } }),
      ),
    ).toEqual({ hasData: false, series: [] });
  });

  it('should support label values and direct series responses', () => {
    expect(
      parsePrometheusResponseEvidence({ status: 'success', data: ['model-a', 'model-b'] }),
    ).toEqual({ hasData: true, series: [] });
    expect(
      parsePrometheusResponseEvidence({
        status: 'success',
        data: [{ namespace: 'namespace-a' }],
      }),
    ).toEqual({ hasData: true, series: [{ metric: { namespace: 'namespace-a' } }] });
  });

  it('should ignore response results without metric labels', () => {
    expect(
      parsePrometheusResponseEvidence({
        status: 'success',
        data: {
          result: [null, { metric: null }, { metric: { namespace: 'namespace-a', value: 1 } }],
        },
      }),
    ).toEqual({
      hasData: true,
      series: [{ metric: { namespace: 'namespace-a' } }],
    });
  });
});

describe('Prometheus request path helpers', () => {
  it('should classify supported Prometheus request paths', () => {
    const basePath = '/perses/api/api/v1/projects/opendatahub/datasources/thanos/proxy/api/v1';
    expect(isPrometheusResponsePath(`${basePath}/query`)).toBe(true);
    expect(isPrometheusQueryPath(`${basePath}/query`)).toBe(true);
    expect(isPrometheusQueryPath(`${basePath}/query_range`)).toBe(true);
    expect(isPrometheusQueryPath(`${basePath}/series`)).toBe(true);
    expect(isPrometheusVariablePath(`${basePath}/label/model_name/values`, 'model_name')).toBe(
      true,
    );
  });

  it('should reject unrelated request paths', () => {
    const basePath = '/perses/api/api/v1/projects/opendatahub/datasources/thanos/proxy/api/v1';
    expect(isPrometheusResponsePath('/perses/api/api/v1/dashboards')).toBe(false);
    expect(isPrometheusQueryPath(`${basePath}/label/model_name/values`)).toBe(false);
    expect(isPrometheusVariablePath(`${basePath}/label/namespace/values`, 'model_name')).toBe(
      false,
    );
  });

  it('should identify an encoded namespace in request parameters or a form body', () => {
    expect(
      requestContainsNamespace('?match%5B%5D=namespace%3D%22namespace-b%22', '', 'namespace-b'),
    ).toBe(true);
    expect(requestContainsNamespace('', 'query=namespace%3D%22namespace-b%22', 'namespace-b')).toBe(
      true,
    );
    expect(requestContainsNamespace('', 'query=up', 'namespace-b')).toBe(false);
    expect(requestContainsNamespace('%', { query: 'up' }, 'namespace-b')).toBe(false);
  });
});
