import {
  validateEvidenceDirectory,
  type ObservabilityRecord,
  type ObservabilityTimeRange,
  type UnauthorizedNamespaceOutcome,
  type ObservabilityCredentials,
} from '../utils/observabilityContract';
import {
  hasSeriesForNamespace,
  isPrometheusQueryPath,
  isPrometheusResponsePath,
  isPrometheusVariablePath,
  hasRequiredLabelsForQuery,
  parsePrometheusResponseEvidence,
  requestContainsNamespace,
  type PrometheusResponseEvidence,
} from '../utils/observabilityResponse';

type PanelState =
  | 'loaded'
  | 'valid-empty'
  | 'empty'
  | 'query-error'
  | 'loading'
  | 'missing'
  | 'not-shipped'
  | 'environment-blocked';

type NetworkEvidence = {
  id: number;
  kind: 'dashboard' | 'perses';
  method: string;
  path: string;
  status: number;
  complete: boolean;
  responseTimeMs: number;
  query?: string;
  responseData?: PrometheusResponseEvidence;
  namespaceMatches?: boolean;
  datasource?: string;
  timeRange?: ObservabilityTimeRange;
  error?: string;
};

type SanitizedPrometheusResponseEvidence = Omit<PrometheusResponseEvidence, 'series'> & {
  seriesCount: number;
  labelNames: string[];
};

type EvidenceContext = {
  jiraKey: string;
  contractVersion: string;
  contractRef: string;
  contractSource: string;
  releaseStage: string;
  persona: string;
  namespaceScope: string;
  dashboard: string;
  contractRecordIds: string[];
  runId: string;
  unauthorizedNamespaceOutcome?: string;
  unauthorizedNamespaceScope?: string;
  authorizationContractRecordIds?: string[];
  foreignDataMustNotRender: true;
  clusterOwnership: 'dashboard-job-local';
};

const DASHBOARD_PATH = '/observe-and-monitor/dashboard';

const DASHBOARD_API_PATHS = new Set(['/api/config', '/api/status']);

const safeFilePart = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const sanitizeEvidenceText = (value: string): string =>
  value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[REDACTED]')
    .replace(
      /((?:authorization|cookie|password|passwd|secret|token|api[_-]?key)\s*[:=]\s*)[^\s,;&]+/gi,
      '$1[REDACTED]',
    );

const sanitizePrometheusResponseEvidence = (
  responseData: PrometheusResponseEvidence,
): SanitizedPrometheusResponseEvidence => ({
  hasData: responseData.hasData,
  prometheusStatus: responseData.prometheusStatus,
  ...(responseData.resultType ? { resultType: responseData.resultType } : {}),
  warnings: responseData.warnings.map(sanitizeEvidenceText),
  seriesCount: responseData.series.length,
  labelNames: [
    ...new Set(responseData.series.flatMap(({ metric }) => Object.keys(metric))),
  ].toSorted(),
  ...(responseData.errorType ? { errorType: responseData.errorType } : {}),
  ...(responseData.error ? { error: sanitizeEvidenceText(responseData.error) } : {}),
});

const sanitizeNetworkEvidence = ({ responseData, error, query, ...request }: NetworkEvidence) => ({
  ...request,
  ...(query ? { query: sanitizeEvidenceText(query) } : {}),
  ...(error ? { error: sanitizeEvidenceText(error) } : {}),
  ...(responseData
    ? {
        responseData: sanitizePrometheusResponseEvidence(responseData),
      }
    : {}),
});

const getRequestQuery = (url: URL, body: unknown): string | undefined => {
  const urlQuery = url.searchParams.get('query');
  if (urlQuery) {
    return urlQuery;
  }
  if (typeof body === 'string') {
    const formQuery = new URLSearchParams(body).get('query');
    if (formQuery) {
      return formQuery;
    }
    try {
      const parsedBody: unknown = JSON.parse(body);
      if (
        typeof parsedBody === 'object' &&
        parsedBody !== null &&
        'query' in parsedBody &&
        typeof parsedBody.query === 'string'
      ) {
        return parsedBody.query;
      }
    } catch {
      // The request body is not JSON; the form-encoded query was already checked above.
    }
  }
  if (
    typeof body === 'object' &&
    body !== null &&
    'query' in body &&
    typeof body.query === 'string'
  ) {
    return body.query;
  }
  return undefined;
};

const getRequestDatasource = (path: string): string | undefined => {
  const datasourceMatch = path.match(/\/datasources\/([^/]+)\/proxy(?:\/|$)/);
  return datasourceMatch ? decodeURIComponent(datasourceMatch[1]) : undefined;
};

const getRequestTimeRange = (url: URL): ObservabilityTimeRange => {
  const timeRange: ObservabilityTimeRange = {};
  ['start', 'end', 'step', 'time'].forEach((key) => {
    const value = url.searchParams.get(key);
    if (value !== null) {
      timeRange[key] = value;
    }
  });
  return timeRange;
};

const normalizePromql = (query: string): string =>
  query.replace(/\$\{([^}]+)\}/g, '$$$1').replace(/\s+/g, '');

const getPromqlMetric = (query: string): string | undefined => {
  const selectorMetric = query.match(/(?:^|[({,])([a-zA-Z_:][a-zA-Z0-9_:]*)(?=\{|$)/);
  return selectorMetric?.[1];
};

const hasPromqlMetricToken = (query: string, metric: string): boolean => {
  const escapedMetric = metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-zA-Z0-9_:])${escapedMetric}(?:$|[^a-zA-Z0-9_:])`).test(query);
};

const getPromqlMatchers = (query: string): Map<string, string> => {
  const matchers = new Map<string, string>();
  const matcherPattern = /(?:^|[{,])([a-zA-Z_][a-zA-Z0-9_]*)\s*(!=|=~|!~|=)\s*"/g;
  for (const match of query.matchAll(matcherPattern)) {
    matchers.set(match[1], match[2]);
  }
  return matchers;
};

const PROMETHEUS_DATASOURCE_ALIASES: Record<string, string[]> = {
  'cluster-thanos': [
    'cluster-thanos',
    'cluster-prometheus-datasource',
    'cluster-prometheus-tenancy-datasource',
    'thanos',
  ],
  tenancy: ['tenancy', 'cluster-prometheus-tenancy-datasource', 'thanos'],
  'namespace-proxy': ['namespace-proxy'],
  'data-science-thanos': ['data-science-thanos', 'data-science-prometheus-datasource'],
  'gpu-aas': ['gpu-aas'],
};

class ObservabilityDashboardPage {
  private networkEvidence: NetworkEvidence[] = [];

  private nextRequestId = 0;

  private networkBoundary = 0;

  private observationBoundary = 0;

  private observationNamespace: string | undefined;

  private observationRequests: NetworkEvidence[] = [];

  private panelStates: Record<string, PanelState> = {};

  private variableSelections: Record<string, string> = {};

  visit() {
    cy.visitWithLogin(DASHBOARD_PATH);
    this.wait();
  }

  visitAsPersona(sessionId: string, credentials: ObservabilityCredentials) {
    cy.session(['observability-dashboard', sessionId], () => {
      cy.visitWithLogin(DASHBOARD_PATH, credentials);
    });
    cy.visit(DASHBOARD_PATH);
    this.wait();
  }

  observeNetworkRequests() {
    this.networkEvidence = [];
    this.nextRequestId = 0;
    this.networkBoundary = 0;
    this.observationBoundary = 0;
    this.observationNamespace = undefined;
    this.observationRequests = [];
    this.panelStates = {};
    this.variableSelections = {};
    cy.intercept({ method: '*', url: '**/api/**' }, (request) => {
      const startedAt = Date.now();
      const url = new URL(request.url);
      const path = url.pathname;
      const evidence: NetworkEvidence = {
        id: this.nextRequestId++,
        kind: path.includes('/perses/api/') ? 'perses' : 'dashboard',
        method: request.method,
        path,
        status: 0,
        complete: false,
        responseTimeMs: 0,
        query: getRequestQuery(url, request.body),
        datasource: getRequestDatasource(path),
        timeRange: getRequestTimeRange(url),
        namespaceMatches:
          this.observationNamespace && isPrometheusResponsePath(path)
            ? requestContainsNamespace(url.search, request.body, this.observationNamespace)
            : undefined,
      };
      this.networkEvidence.push(evidence);
      request.continue((response) => {
        const { statusCode: status } = response;
        evidence.status = status;
        evidence.complete = true;
        evidence.responseTimeMs = Date.now() - startedAt;
        if (isPrometheusResponsePath(path)) {
          const responseData = parsePrometheusResponseEvidence(response.body);
          if (responseData) {
            evidence.responseData = responseData;
          }
        }
        if (status >= 400 && response.statusMessage) {
          evidence.error = response.statusMessage;
        }
      });
    });
    return this;
  }

  beginDashboardValidation() {
    cy.then(() => {
      this.networkBoundary = this.nextRequestId;
      this.panelStates = {};
      this.variableSelections = {};
    });
    return this;
  }

  beginNetworkObservation(namespace: string) {
    cy.then(() => {
      this.observationBoundary = this.nextRequestId;
      this.observationNamespace = namespace;
    });
    return this;
  }

  recordObservationEvidence() {
    cy.then(() => {
      this.observationRequests = this.getRequestsSince(this.observationBoundary);
    });
    return this;
  }

  private wait() {
    this.findPageTitle().should('be.visible');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findEmptyState() {
    return cy.findByText(
      'No dashboards were found. Verify that the monitoring stack is configured correctly.',
    );
  }

  findPersesLoadErrorTitle() {
    return cy.findByText('Unable to reach observability dashboards');
  }

  findNotFoundPage() {
    return cy.findByTestId('not-found-page');
  }

  findTabs() {
    return cy.findByTestId('observability-dashboard-tabs');
  }

  findTab(name: string) {
    return cy.findByRole('tab', { name });
  }

  findAllTabs() {
    return this.findTabs().find('[role="tab"]');
  }

  findPanel(panelId: string, displayName?: string) {
    return cy.findAllByTestId('panel').filter((_, panel) => {
      const title = Cypress.$(panel).find('[id$="-title"]');
      const titleId = title.attr('id');
      const matchesPanelId =
        typeof titleId === 'string' &&
        (titleId === `${panelId}-title` || titleId.endsWith(`-${panelId}-title`));
      return matchesPanelId && (displayName === undefined || title.text().trim() === displayName);
    });
  }

  findVariable(variableName: string) {
    return cy.findByTestId(`variable-${variableName}`);
  }

  findVariableInput(variableName: string) {
    return this.findVariable(variableName).find('input');
  }

  findVariableOptions(variableName: string) {
    return this.findVariableInput(variableName)
      .invoke('attr', 'aria-controls')
      .then((listboxId) => {
        if (!listboxId) {
          throw new Error(`Variable '${variableName}' did not expose an open options list`);
        }
        return cy
          .get('[role="listbox"]')
          .filter((_, listbox) => listbox.id === listboxId)
          .find('[role="option"]');
      });
  }

  findVariableOption(variableName: string, optionName: string) {
    return this.findVariableOptions(variableName).filter((_, option) => {
      return option.textContent.trim() === optionName;
    });
  }

  shouldHaveDashboard(displayName: string) {
    this.findTab(displayName).should('exist').and('be.visible');
    return this;
  }

  shouldNotHaveDashboard(displayName: string) {
    this.findTab(displayName).should('not.exist');
    return this;
  }

  selectDashboard(displayName: string) {
    const tab = this.findTab(displayName);
    tab.invoke('attr', 'aria-selected').then((selected) => {
      if (selected === 'true') {
        this.networkBoundary = 0;
      } else {
        tab.click();
      }
    });
    tab.should('have.attr', 'aria-selected', 'true');
    return this;
  }

  shouldHavePanelState(
    panelId: string,
    displayName: string | undefined,
    expectedState: 'non-empty' | 'valid-empty',
    expectedEmptyUiState = 'No data',
  ) {
    this.findPanel(panelId, displayName)
      .should('be.visible')
      .should(($panels) => {
        const state = this.getPanelStateFromPanels($panels, expectedEmptyUiState);
        this.panelStates[panelId] = state;
        const validStates =
          expectedState === 'valid-empty' ? ['loaded', 'valid-empty'] : ['loaded'];
        expect(
          validStates,
          `panel '${displayName ?? panelId}' should be ${
            expectedState === 'non-empty' ? 'loaded' : 'valid-empty'
          }`,
        ).to.include(state);
      });
    return this;
  }

  shouldHaveRenderedPanel(panelId: string, displayName?: string) {
    this.findPanel(panelId, displayName)
      .should('be.visible')
      .should(($panels) => {
        expect($panels, `panel '${displayName ?? panelId}' should render once`).to.have.length(1);
        expect(
          $panels.find('[aria-label="panel errors"], [role="alert"]'),
          `panel '${displayName ?? panelId}' should not show an error`,
        ).to.have.length(0);
        this.panelStates[panelId] = 'loaded';
      });
    return this;
  }

  shouldNotHavePanel(panelId: string, displayName?: string) {
    this.findPanel(panelId, displayName).should('not.exist');
    return this;
  }

  recordPanelState(panelId: string, state: 'not-shipped' | 'environment-blocked') {
    this.panelStates[panelId] = state;
    return this;
  }

  shouldHaveSuccessfulRequests(
    records: ObservabilityRecord[],
    requireData = false,
    expectedNamespace?: string,
  ) {
    cy.wrap(null).should(() => {
      const requests = this.getRequestsSince(this.networkBoundary).filter((request) =>
        this.isPrometheusPanelQueryRequest(request),
      );
      expect(requests, 'Prometheus query requests').not.to.have.length(0);
      const shippedRecords = records.filter(({ capability }) => capability === 'shipped');
      expect(shippedRecords, 'shipped dashboard contract records').not.to.have.length(0);
      expect(
        requests.filter(
          (request) =>
            !shippedRecords.some((record) => this.matchesContractRequest(request, record)),
        ),
        'Prometheus requests without a matching release-contract request shape',
      ).to.have.length(0);
      const expectedHttpStatuses = new Set(
        shippedRecords.flatMap(({ expectedHttpStatus }) => expectedHttpStatus),
      );
      const expectedPrometheusStatuses = new Set(
        shippedRecords.map(({ expectedPrometheusStatus }) => expectedPrometheusStatus),
      );
      expect(
        requests.filter(({ status }) => !expectedHttpStatuses.has(status)),
        'unexpected HTTP statuses for dashboard contract requests',
      ).to.have.length(0);
      expect(
        requests.filter(
          ({ complete, status, responseData }) =>
            !complete ||
            status < 200 ||
            status >= 300 ||
            responseData === undefined ||
            responseData.error !== undefined ||
            responseData.errorType !== undefined,
        ),
        'failed API requests for the selected dashboard',
      ).to.have.length(0);
      expect(
        requests.filter(
          ({ query, responseData }) =>
            !query ||
            !responseData ||
            !expectedPrometheusStatuses.has(responseData.prometheusStatus),
        ),
        'dashboard requests without contract-valid Prometheus responses',
      ).to.have.length(0);
      const warningsAllowed = shippedRecords.some(
        ({ warningsAllowed: recordWarningsAllowed }) => recordWarningsAllowed,
      );
      expect(
        requests.filter(
          ({ responseData }) =>
            responseData !== undefined && responseData.warnings.length > 0 && !warningsAllowed,
        ),
        'dashboard requests with unexpected Prometheus warnings',
      ).to.have.length(0);
      expect(
        requests.filter(({ path, responseData }) => {
          if (!responseData?.resultType) {
            return true;
          }
          // Perses uses range queries for charts even when the release contract describes
          // the equivalent instant query as a vector.
          return !shippedRecords.some((record) =>
            this.matchesExpectedResultType(path, responseData, record.expectedResultType),
          );
        }),
        'dashboard requests with unexpected Prometheus result types',
      ).to.have.length(0);
      const dataRequests = requests.filter(({ responseData }) => responseData?.hasData === true);
      expect(
        dataRequests.filter(
          ({ path, query, responseData }) =>
            responseData === undefined ||
            !shippedRecords.some(
              (record) =>
                this.matchesExpectedResultType(path, responseData, record.expectedResultType) &&
                responseData.series.length >= record.minimumSeries &&
                hasRequiredLabelsForQuery(responseData, record.requiredLabels, query ?? ''),
            ),
        ),
        'dashboard data responses without contract-required series and labels',
      ).to.have.length(0);
      if (requireData) {
        const minimumRequiredSeries = Math.max(
          ...shippedRecords.map(({ minimumSeries: recordMinimumSeries }) => recordMinimumSeries),
        );
        expect(
          expectedNamespace
            ? dataRequests.some(
                ({ query, responseData }) =>
                  responseData !== undefined &&
                  responseData.series.length >= minimumRequiredSeries &&
                  hasSeriesForNamespace(responseData, expectedNamespace) &&
                  shippedRecords.some((record) =>
                    hasRequiredLabelsForQuery(responseData, record.requiredLabels, query ?? ''),
                  ),
              )
            : dataRequests.some(
                ({ responseData }) =>
                  responseData !== undefined && responseData.series.length >= minimumRequiredSeries,
              ),
          'selected dashboard telemetry data',
        ).to.equal(true);
      }
    });
    return this;
  }

  shouldHaveSuccessfulDashboardRequest() {
    cy.wrap(null).should(() => {
      expect(
        this.networkEvidence.some(
          ({ kind, path, status, complete }) =>
            complete &&
            kind === 'dashboard' &&
            DASHBOARD_API_PATHS.has(path) &&
            status >= 200 &&
            status < 300,
        ),
        'dashboard API request',
      ).to.equal(true);
    });
    return this;
  }

  shouldHaveUnauthorizedNamespaceResponse(
    outcome: UnauthorizedNamespaceOutcome,
    variableName: string,
  ) {
    cy.wrap(null).should(() => {
      const requests = this.getRequestsSince(this.observationBoundary).filter((request) =>
        this.isPrometheusResponseRequest(request),
      );
      const queryRequests = requests.filter((request) =>
        this.isPrometheusPanelQueryRequest(request),
      );
      const namespaceQueryRequests = queryRequests.filter(
        ({ namespaceMatches }) => namespaceMatches,
      );
      const relevantQueryRequests =
        namespaceQueryRequests.length > 0 ? namespaceQueryRequests : queryRequests;
      const variableRequests = requests.filter((request) =>
        this.isPrometheusVariableRequest(request, variableName),
      );
      const selectorRequests =
        variableRequests.length > 0 ? variableRequests : relevantQueryRequests;
      if (outcome === '403' || outcome === '404') {
        expect(namespaceQueryRequests, 'Prometheus namespace query requests').not.to.have.length(0);
      }
      const namespaceRequests =
        outcome === '403' || outcome === '404'
          ? [...new Set([...relevantQueryRequests, ...variableRequests])]
          : selectorRequests;

      expect(namespaceRequests, 'Prometheus namespace requests').not.to.have.length(0);
      expect(
        namespaceRequests.filter(({ complete }) => !complete),
        'pending requests',
      ).to.have.length(0);
      if (outcome === '403' || outcome === '404') {
        expect(
          namespaceRequests.every(({ status }) => status === Number(outcome)),
          `HTTP ${outcome} namespace response`,
        ).to.equal(true);
        return;
      }

      expect(
        selectorRequests.every(({ status }) => status >= 200 && status < 300),
        'successful namespace response',
      ).to.equal(true);
      expect(
        selectorRequests.filter(
          ({ responseData }) => responseData === undefined || responseData.error !== undefined,
        ),
        'Prometheus response data',
      ).to.have.length(0);

      expect(relevantQueryRequests, 'Prometheus telemetry requests').not.to.have.length(0);
      expect(
        relevantQueryRequests.filter(
          ({ complete, status, responseData }) =>
            !complete ||
            status < 200 ||
            status >= 300 ||
            responseData === undefined ||
            responseData.error !== undefined,
        ),
        'failed unauthorized namespace telemetry requests',
      ).to.have.length(0);
      if (outcome === 'success-empty') {
        expect(
          [...selectorRequests, ...relevantQueryRequests].every(
            ({ responseData }) => responseData?.hasData === false,
          ),
          'empty namespace response data',
        ).to.equal(true);
        return;
      }
      if (!this.observationNamespace) {
        throw new Error('Unauthorized namespace observation did not record a namespace');
      }
      const { observationNamespace } = this;
      expect(
        relevantQueryRequests.some(
          ({ responseData }) =>
            responseData !== undefined && hasSeriesForNamespace(responseData, observationNamespace),
        ),
        'unauthorized namespace series',
      ).to.equal(false);
    });
    return this;
  }

  shouldNotHaveVariableOptions(variableName: string, optionNames: string[]) {
    this.findVariableOptions(variableName).should(($options) => {
      const visibleOptions = $options.toArray().map((option) => option.textContent.trim());
      optionNames.forEach((optionName) => {
        expect(visibleOptions, `variable option '${optionName}'`).not.to.include(optionName);
      });
    });
    return this;
  }

  shouldHaveNoVariableOptions(variableName: string) {
    this.findVariableOptions(variableName).should('have.length', 0);
    return this;
  }

  shouldHaveSelectedVariable(variableName: string, expectedOptions: string[]) {
    this.findVariable(variableName)
      .find('[data-tag-index]')
      .should(($tags) => {
        const selectedOptions = $tags.toArray().map((tag) => tag.textContent.trim());
        expect(selectedOptions, `selected values for '${variableName}'`).to.deep.equal(
          expectedOptions,
        );
      });
    return this;
  }

  shouldNotRenderValues(panelId: string, values: string[], displayName?: string) {
    this.findPanel(panelId, displayName).should(($panels) => {
      const panelText = $panels.text();
      values.forEach((value) => {
        expect(panelText, `panel '${displayName ?? panelId}'`).not.to.include(value);
      });
    });
    return this;
  }

  private getPanelStateFromPanels(
    panels: JQuery<HTMLElement>,
    expectedEmptyUiState: string,
  ): PanelState {
    if (!panels.length) {
      return 'missing';
    }
    if (
      panels.length !== 1 ||
      panels.find('[aria-label="panel errors"], [role="alert"]').length > 0
    ) {
      return 'query-error';
    }
    if (
      panels
        .find('[aria-label]')
        .toArray()
        .some((child) =>
          (child.getAttribute('aria-label') || '').toLowerCase().startsWith('loading'),
        )
    ) {
      return 'loading';
    }
    const hasEmptyState = panels
      .find('p')
      .toArray()
      .some((element) => element.textContent.trim() === expectedEmptyUiState);
    if (hasEmptyState) {
      return 'valid-empty';
    }
    const hasRenderedContent = panels.find('svg, canvas, table tbody tr, [role="img"]').length > 0;
    return hasRenderedContent ? 'loaded' : 'empty';
  }

  captureVariableSelections(variableNames: string[]) {
    variableNames.forEach((variableName) => {
      this.findVariable(variableName)
        .invoke('text')
        .then((text) => {
          this.variableSelections[variableName] = text.trim();
        });
    });
    return this;
  }

  writeEvidence(directory: string, context: EvidenceContext) {
    const evidenceDirectory = validateEvidenceDirectory(directory, { allowAbsolute: true });
    const fileName = [context.runId, context.persona, context.dashboard]
      .map(safeFilePart)
      .join('-');

    cy.then(() => {
      const requests = Array.from(
        new Map(
          [...this.observationRequests, ...this.getRequestsSince(this.networkBoundary)].map(
            (request) => [request.id, request] as const,
          ),
        ).values(),
      ).toSorted((left, right) => left.id - right.id);
      cy.writeFile(`${evidenceDirectory}/${fileName}.json`, {
        ...context,
        selections: { ...this.variableSelections },
        panels: { ...this.panelStates },
        requests: requests.map(sanitizeNetworkEvidence),
      });
      this.observationRequests = [];
    });
    return this;
  }

  private getRequestsSince(boundary: number) {
    return this.networkEvidence.filter(({ id }) => id >= boundary);
  }

  private isPrometheusResponseRequest(request: NetworkEvidence) {
    return request.kind === 'perses' && isPrometheusResponsePath(request.path);
  }

  private isPrometheusQueryRequest(request: NetworkEvidence) {
    return this.isPrometheusResponseRequest(request) && isPrometheusQueryPath(request.path);
  }

  private isPrometheusPanelQueryRequest(request: NetworkEvidence) {
    return this.isPrometheusQueryRequest(request) && !request.path.endsWith('/series');
  }

  private matchesExpectedResultType(
    path: string,
    responseData: PrometheusResponseEvidence,
    expectedResultType: string,
  ) {
    if (responseData.resultType === expectedResultType) {
      return true;
    }
    return (
      path.endsWith('/query_range') &&
      responseData.resultType === 'matrix' &&
      expectedResultType === 'vector'
    );
  }

  private matchesContractRequest(request: NetworkEvidence, record: ObservabilityRecord): boolean {
    const routeMatches =
      request.path.endsWith(record.route) ||
      (record.route.endsWith('/query') && request.path.endsWith('/query_range'));
    if (!routeMatches) {
      return false;
    }

    if (request.datasource) {
      const aliases = PROMETHEUS_DATASOURCE_ALIASES[record.datasource] ?? [record.datasource];
      if (!aliases.includes(request.datasource)) {
        return false;
      }
    }

    const expectedTimeRange = Object.entries(record.timeRange);
    if (
      expectedTimeRange.some(([key, value]) => String(request.timeRange?.[key]) !== String(value))
    ) {
      return false;
    }

    if (!request.query) {
      return false;
    }
    const normalizedRequestQuery = normalizePromql(request.query);
    const normalizedContractQuery = normalizePromql(record.promql);
    if (normalizedRequestQuery === normalizedContractQuery) {
      return true;
    }

    const contractMetric = getPromqlMetric(record.promql);
    if (contractMetric && hasPromqlMetricToken(request.query, contractMetric)) {
      return true;
    }

    // Dashboard panels may aggregate or join a producer query while preserving its
    // selector semantics. For those queries, compare the selector keys that overlap
    // with the release contract instead of requiring identical PromQL text.
    const contractMatchers = getPromqlMatchers(record.promql);
    const requestMatchers = getPromqlMatchers(request.query);
    const isAggregateQuery = /(?:^|[^a-zA-Z0-9_])(sum|avg|count|max|min|rate|increase)\(/.test(
      request.query,
    );
    return (
      isAggregateQuery &&
      [...contractMatchers.entries()].every(
        ([label, operator]) =>
          !requestMatchers.has(label) || requestMatchers.get(label) === operator,
      )
    );
  }

  private isPrometheusVariableRequest(request: NetworkEvidence, variableName: string) {
    return (
      this.isPrometheusResponseRequest(request) &&
      isPrometheusVariablePath(request.path, variableName)
    );
  }

  shouldHaveEmptyState() {
    this.findEmptyState().should('exist');
    return this;
  }

  shouldHavePersesLoadError() {
    this.findPersesLoadErrorTitle().should('exist');
    return this;
  }

  shouldHaveNotFoundPage() {
    this.findNotFoundPage().should('exist');
    return this;
  }

  shouldHaveTab(name: string) {
    this.findTab(name).should('exist');
    return this;
  }

  shouldNotHaveTab(name: string) {
    cy.findByRole('tab', { name }).should('not.exist');
    return this;
  }

  shouldHaveTabCount(count: number) {
    this.findAllTabs().should('have.length', count);
    return this;
  }
}

export const observabilityDashboardPage = new ObservabilityDashboardPage();
