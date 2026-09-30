import type { UserAuthConfig } from '../../../cypress/cypress/types';
import {
  validateEvidenceDirectory,
  type UnauthorizedNamespaceOutcome,
} from '../../src/utils/observabilityContract';
import {
  hasSeriesForNamespace,
  isPrometheusQueryPath,
  isPrometheusResponsePath,
  isPrometheusVariablePath,
  parsePrometheusResponseEvidence,
  requestContainsNamespace,
  type PrometheusResponseEvidence,
} from '../../src/utils/observabilityResponse';

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
  responseData?: PrometheusResponseEvidence;
  namespaceMatches?: boolean;
  error?: string;
};

type EvidenceContext = {
  jiraKey: string;
  releaseStage: string;
  dashboardVersion: string;
  imageVersion: string;
  persona: string;
  namespaceScope: string;
  dashboard: string;
  runId: string;
  unauthorizedNamespaceOutcome: string;
  foreignDataMustNotRender: true;
};

const DASHBOARD_PATH = '/observe-and-monitor/dashboard';

const DASHBOARD_API_PATHS = new Set(['/api/config', '/api/status']);

const safeFilePart = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

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

  visitAsPersona(sessionId: string, credentials: UserAuthConfig) {
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

  findPanel(panelId: string, displayName: string) {
    return cy.findAllByTestId('panel').filter((_, panel) => {
      const title = Cypress.$(panel).find('[id$="-title"]');
      const titleId = title.attr('id');
      const matchesPanelId =
        typeof titleId === 'string' &&
        (titleId === `${panelId}-title` || titleId.endsWith(`-${panelId}-title`));
      return matchesPanelId && title.text().trim() === displayName;
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
    displayName: string,
    expectedState: 'non-empty' | 'valid-empty',
  ) {
    this.findPanel(panelId, displayName)
      .should('be.visible')
      .should(($panels) => {
        const state = this.getPanelStateFromPanels($panels);
        this.panelStates[panelId] = state;
        expect(
          state,
          `panel '${displayName}' should be ${
            expectedState === 'non-empty' ? 'loaded' : 'valid-empty'
          }`,
        ).to.equal(expectedState === 'non-empty' ? 'loaded' : 'valid-empty');
      });
    return this;
  }

  shouldNotHavePanel(panelId: string, displayName: string) {
    this.findPanel(panelId, displayName).should('not.exist');
    return this;
  }

  recordPanelState(panelId: string, state: 'not-shipped' | 'environment-blocked') {
    this.panelStates[panelId] = state;
    return this;
  }

  shouldHaveSuccessfulRequests(requireData = false, expectedNamespace?: string) {
    cy.wrap(null).should(() => {
      const requests = this.getRequestsSince(this.networkBoundary).filter((request) =>
        this.isPrometheusQueryRequest(request),
      );
      expect(requests, 'Prometheus query requests').not.to.have.length(0);
      expect(
        requests.filter(
          ({ complete, status, responseData }) =>
            !complete ||
            status < 200 ||
            status >= 300 ||
            responseData === undefined ||
            responseData.error !== undefined,
        ),
        'failed API requests for the selected dashboard',
      ).to.have.length(0);
      if (requireData) {
        const dataRequests = requests.filter(({ responseData }) => responseData?.hasData === true);
        expect(
          expectedNamespace
            ? dataRequests.some(
                ({ responseData }) =>
                  responseData !== undefined &&
                  hasSeriesForNamespace(responseData, expectedNamespace),
              )
            : dataRequests.length > 0,
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
      const queryRequests = requests.filter((request) => this.isPrometheusQueryRequest(request));
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
      if (outcome === 'forbidden') {
        expect(namespaceQueryRequests, 'Prometheus namespace query requests').not.to.have.length(0);
      }
      const namespaceRequests =
        outcome === 'forbidden'
          ? [...new Set([...relevantQueryRequests, ...variableRequests])]
          : selectorRequests;

      expect(namespaceRequests, 'Prometheus namespace requests').not.to.have.length(0);
      expect(
        namespaceRequests.filter(({ complete }) => !complete),
        'pending requests',
      ).to.have.length(0);
      expect(
        namespaceRequests.filter(
          ({ status }) => !((status >= 200 && status < 300) || status === 401 || status === 403),
        ),
        'unexpected namespace responses',
      ).to.have.length(0);
      if (outcome === 'forbidden') {
        expect(
          namespaceRequests.every(({ status }) => status === 401 || status === 403),
          'forbidden namespace response',
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
      if (outcome === 'empty') {
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

  shouldNotRenderValues(panelId: string, displayName: string, values: string[]) {
    this.findPanel(panelId, displayName).should(($panels) => {
      const panelText = $panels.text();
      values.forEach((value) => {
        expect(panelText, `panel '${displayName}'`).not.to.include(value);
      });
    });
    return this;
  }

  private getPanelStateFromPanels(panels: JQuery<HTMLElement>): PanelState {
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
      .some((element) => element.textContent.trim() === 'No data');
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
    const evidenceDirectory = validateEvidenceDirectory(directory);
    const fileName = [context.runId, context.persona, context.dashboard]
      .map(safeFilePart)
      .join('-');

    cy.then(() => {
      cy.writeFile(`${evidenceDirectory}/${fileName}.json`, {
        ...context,
        selections: { ...this.variableSelections },
        panels: { ...this.panelStates },
        requests: [...this.observationRequests, ...this.getRequestsSince(this.networkBoundary)],
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
