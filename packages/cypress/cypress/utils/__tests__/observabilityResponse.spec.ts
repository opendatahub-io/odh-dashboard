import {
  hasSeriesForNamespace,
  hasRequiredLabels,
  hasRequiredLabelsForQuery,
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

  it('should retain every series and all string labels for contract evidence', () => {
    const response = parsePrometheusResponseEvidence({
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          { metric: { namespace: 'namespace-a', model_name: 'model-a' }, value: [1, '1'] },
          { metric: { namespace: 'namespace-a', model_name: 'model-b' }, value: [1, '2'] },
        ],
      },
    });

    expect(response?.series).toHaveLength(2);
    expect(response?.series[1]?.metric).toEqual({
      namespace: 'namespace-a',
      model_name: 'model-b',
    });
    if (!response) {
      throw new Error('Expected a valid Prometheus response');
    }
    expect(hasRequiredLabels(response, ['namespace', 'model_name'])).toBe(true);
    expect(hasRequiredLabels(response, ['namespace', 'pod'])).toBe(false);
  });

  it('should require all labels on the same series', () => {
    const response = parsePrometheusResponseEvidence({
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          { metric: { namespace: 'namespace-a' }, value: [1, '1'] },
          { metric: { model_name: 'model-a' }, value: [1, '2'] },
        ],
      },
    });

    if (!response) {
      throw new Error('Expected a valid Prometheus response');
    }
    expect(hasRequiredLabels(response, ['namespace', 'model_name'])).toBe(false);
  });

  it('should not require labels for aggregate queries that do not emit them', () => {
    const response = parsePrometheusResponseEvidence({
      status: 'success',
      data: {
        resultType: 'vector',
        result: [{ metric: {}, value: [1, '1'] }],
      },
    });

    if (!response) {
      throw new Error('Expected a valid Prometheus response');
    }
    expect(
      hasRequiredLabelsForQuery(
        response,
        ['namespace'],
        'count(max by (node) (kube_node_status_condition{condition="Ready"}))',
      ),
    ).toBe(true);
  });

  it('should identify an empty successful response', () => {
    const response = parsePrometheusResponseEvidence({
      status: 'success',
      data: { resultType: 'matrix', result: [] },
    });

    expect(response).toEqual({
      hasData: false,
      prometheusStatus: 'success',
      resultType: 'matrix',
      warnings: [],
      series: [],
    });
  });

  it('should reject malformed response bodies', () => {
    expect(parsePrometheusResponseEvidence('{')).toBeUndefined();
    expect(parsePrometheusResponseEvidence({ status: 'error' })).toEqual({
      hasData: false,
      prometheusStatus: 'error',
      warnings: [],
      series: [],
      error: 'Prometheus response error',
    });
    expect(
      parsePrometheusResponseEvidence({
        status: 'success',
        errorType: 'execution',
        error: 'query failed',
        data: { resultType: 'vector', result: [] },
      }),
    ).toEqual({
      hasData: false,
      prometheusStatus: 'success',
      resultType: 'vector',
      warnings: [],
      series: [],
      errorType: 'execution',
      error: 'query failed',
    });
    expect(parsePrometheusResponseEvidence({ status: 'pending' })).toBeUndefined();
    expect(parsePrometheusResponseEvidence({ status: 'success', data: {} })).toBeUndefined();
  });

  it('should parse JSON response bodies', () => {
    expect(
      parsePrometheusResponseEvidence(
        JSON.stringify({ status: 'success', data: { resultType: 'matrix', result: [] } }),
      ),
    ).toEqual({
      hasData: false,
      prometheusStatus: 'success',
      resultType: 'matrix',
      warnings: [],
      series: [],
    });
  });

  it('should support label values and direct series responses', () => {
    expect(
      parsePrometheusResponseEvidence({ status: 'success', data: ['model-a', 'model-b'] }),
    ).toEqual({ hasData: true, prometheusStatus: 'success', warnings: [], series: [] });
    expect(
      parsePrometheusResponseEvidence({
        status: 'success',
        data: [{ namespace: 'namespace-a' }],
      }),
    ).toEqual({
      hasData: true,
      prometheusStatus: 'success',
      warnings: [],
      series: [{ metric: { namespace: 'namespace-a' } }],
    });
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
      prometheusStatus: 'success',
      warnings: [],
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

  it('should match exact namespace label matchers in request parameters or a form body', () => {
    expect(
      requestContainsNamespace('?match%5B%5D=namespace%3D%22namespace-b%22', '', 'namespace-b'),
    ).toBe(true);
    expect(
      requestContainsNamespace(
        '',
        'query=metric%7Bnamespace%3D%22namespace-b%22%7D',
        'namespace-b',
      ),
    ).toBe(true);
    expect(
      requestContainsNamespace(
        '',
        'query=metric%7Bmodel_name%3D%22namespace-b%22%7D',
        'namespace-b',
      ),
    ).toBe(false);
    expect(
      requestContainsNamespace(
        '',
        'query=metric%7Bnamespace%3D%22namespace-b-extra%22%7D',
        'namespace-b',
      ),
    ).toBe(false);
  });

  it('should evaluate valid namespace regex matchers and ignore invalid ones', () => {
    expect(
      requestContainsNamespace(
        '',
        'query=metric%7Bnamespace%3D~%22namespace-%28a%7Cb%29%22%7D',
        'namespace-b',
      ),
    ).toBe(true);
    expect(
      requestContainsNamespace(
        '',
        'query=metric%7Bnamespace%3D~%22namespace-b%22%7D',
        'namespace-b-extra',
      ),
    ).toBe(false);
    expect(
      requestContainsNamespace('', 'query=metric%7Bnamespace%3D~%22%5B%22%7D', 'namespace-b'),
    ).toBe(false);
  });
});
