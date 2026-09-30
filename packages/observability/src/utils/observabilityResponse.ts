export type PrometheusSeriesEvidence = {
  metric: {
    namespace?: string;
  };
};

export type PrometheusResponseEvidence = {
  hasData: boolean;
  series: PrometheusSeriesEvidence[];
  error?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseResponseBody = (body: unknown): unknown => {
  if (typeof body !== 'string') {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const parseMetric = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return typeof value.namespace === 'string' ? { namespace: value.namespace } : {};
};

const parseSeries = (items: unknown[], nestedMetric: boolean): PrometheusSeriesEvidence[] => {
  const namespaces = new Set<string>();
  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const metric = parseMetric(nestedMetric ? item.metric : item);
    if (!metric?.namespace || namespaces.has(metric.namespace)) {
      return [];
    }
    namespaces.add(metric.namespace);
    return [{ metric }];
  });
};

export const parsePrometheusResponseEvidence = (
  body: unknown,
): PrometheusResponseEvidence | undefined => {
  const parsedBody = parseResponseBody(body);
  if (!isRecord(parsedBody)) {
    return undefined;
  }
  if (parsedBody.status === 'error') {
    return {
      hasData: false,
      series: [],
      error: typeof parsedBody.error === 'string' ? parsedBody.error : 'Prometheus response error',
    };
  }
  if (parsedBody.status !== 'success') {
    return undefined;
  }
  if (Array.isArray(parsedBody.data)) {
    return {
      hasData: parsedBody.data.length > 0,
      series: parseSeries(parsedBody.data, false),
    };
  }
  if (!isRecord(parsedBody.data) || !Array.isArray(parsedBody.data.result)) {
    return undefined;
  }
  return {
    hasData: parsedBody.data.result.length > 0,
    series: parseSeries(parsedBody.data.result, true),
  };
};

export const isPrometheusResponsePath = (path: string): boolean => path.includes('/proxy/api/v1/');

export const isPrometheusQueryPath = (path: string): boolean =>
  /\/api\/v1\/(?:query|query_range|series)$/.test(path);

export const isPrometheusVariablePath = (path: string, variableName: string): boolean =>
  path.endsWith(`/api/v1/label/${encodeURIComponent(variableName)}/values`);

export const requestContainsNamespace = (
  search: string,
  body: unknown,
  namespace: string,
): boolean => {
  const requestContent = [search, typeof body === 'string' ? body : ''].join(' ');
  try {
    return decodeURIComponent(requestContent.replace(/\+/g, ' ')).includes(namespace);
  } catch {
    return false;
  }
};

export const hasSeriesForNamespace = (
  response: PrometheusResponseEvidence,
  namespace: string,
): boolean => response.series.some(({ metric }) => metric.namespace === namespace);
