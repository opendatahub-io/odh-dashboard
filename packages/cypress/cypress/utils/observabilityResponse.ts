export type PrometheusSeriesEvidence = {
  metric: Record<string, string>;
};

export type PrometheusResponseEvidence = {
  hasData: boolean;
  prometheusStatus: string;
  resultType?: string;
  warnings: string[];
  series: PrometheusSeriesEvidence[];
  errorType?: string;
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
  const metric: Record<string, string> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === 'string') {
      metric[key] = item;
    }
  });
  return metric;
};

const parseSeries = (items: unknown[], nestedMetric: boolean): PrometheusSeriesEvidence[] => {
  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const metric = parseMetric(nestedMetric ? item.metric : item);
    if (!metric || Object.keys(metric).length === 0) {
      return [];
    }
    return [{ metric }];
  });
};

const parseWarnings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const parseOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const parsePrometheusResponseEvidence = (
  body: unknown,
): PrometheusResponseEvidence | undefined => {
  const parsedBody = parseResponseBody(body);
  if (!isRecord(parsedBody)) {
    return undefined;
  }
  if (parsedBody.status === 'error') {
    const error = parseOptionalString(parsedBody.error);
    const errorType = parseOptionalString(parsedBody.errorType);
    return {
      hasData: false,
      prometheusStatus: 'error',
      warnings: parseWarnings(parsedBody.warnings),
      series: [],
      ...(errorType ? { errorType } : {}),
      error: error || 'Prometheus response error',
    };
  }
  if (parsedBody.status !== 'success') {
    return undefined;
  }
  if (Array.isArray(parsedBody.data)) {
    const error = parseOptionalString(parsedBody.error);
    const errorType = parseOptionalString(parsedBody.errorType);
    return {
      hasData: parsedBody.data.length > 0,
      prometheusStatus: 'success',
      warnings: parseWarnings(parsedBody.warnings),
      series: parseSeries(parsedBody.data, false),
      ...(errorType ? { errorType } : {}),
      ...(error ? { error } : {}),
    };
  }
  if (!isRecord(parsedBody.data) || !Array.isArray(parsedBody.data.result)) {
    return undefined;
  }
  const error = parseOptionalString(parsedBody.error);
  const errorType = parseOptionalString(parsedBody.errorType);
  return {
    hasData: parsedBody.data.result.length > 0,
    prometheusStatus: 'success',
    ...(typeof parsedBody.data.resultType === 'string'
      ? { resultType: parsedBody.data.resultType }
      : {}),
    warnings: parseWarnings(parsedBody.warnings),
    series: parseSeries(parsedBody.data.result, true),
    ...(errorType ? { errorType } : {}),
    ...(error ? { error } : {}),
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
  const requestContents = [search, typeof body === 'string' ? body : ''].flatMap((part) => {
    let decodedPart = part;
    try {
      decodedPart = decodeURIComponent(part.replace(/\+/g, ' '));
    } catch {
      // Keep the raw request content when a different parameter is malformed.
    }
    return [decodedPart, ...new URLSearchParams(part).values()];
  });
  const namespaceMatchers = /(?:^|[,{]\s*)namespace\s*(=|=~)\s*"((?:\\.|[^"\\])*)"/g;

  for (const requestContent of requestContents) {
    for (const [, operator, value] of requestContent.matchAll(namespaceMatchers)) {
      if (operator === '=' && value === namespace) {
        return true;
      }
      if (operator === '=~') {
        try {
          if (new RegExp(`^(?:${value})$`).test(namespace)) {
            return true;
          }
        } catch {
          // Ignore invalid regular expressions and inspect any remaining matchers.
        }
      }
    }
  }
  return false;
};

export const hasSeriesForNamespace = (
  response: PrometheusResponseEvidence,
  namespace: string,
): boolean =>
  response.series.some(
    ({ metric }) =>
      metric.namespace === namespace ||
      metric.k8s_namespace_name === namespace ||
      metric.namespace_name === namespace,
  );

export const hasRequiredLabels = (
  response: PrometheusResponseEvidence,
  requiredLabels: string[],
): boolean =>
  response.series.some(({ metric }) => requiredLabels.every((label) => label in metric));

export const hasRequiredLabelsForQuery = (
  response: PrometheusResponseEvidence,
  requiredLabels: string[],
  query: string,
): boolean => {
  const referencedLabels = requiredLabels.filter((label) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedLabel}\\b`).test(query);
  });
  return referencedLabels.length === 0 || hasRequiredLabels(response, referencedLabels);
};
