import { observabilityDashboardPage } from '../../pages/observabilityDashboard';
import {
  loadObservabilityContract,
  resolveObservabilityCredentials,
  type ObservabilityContract,
  type ObservabilityDashboardContract,
  type ObservabilityPersonaContract,
} from '../../utils/observabilityContract';

const contract = loadObservabilityContract();

const findDashboard = (
  observabilityContract: ObservabilityContract,
  dashboardName: string,
): ObservabilityDashboardContract => {
  const dashboard = observabilityContract.dashboards.find(({ name }) => name === dashboardName);
  if (!dashboard) {
    throw new Error(`Dashboard '${dashboardName}' is missing from the observability contract`);
  }
  return dashboard;
};

const findModelDashboard = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaContract,
): ObservabilityDashboardContract => {
  if (!persona.modelDashboardName) {
    throw new Error(`Persona '${persona.id}' has no model dashboard in the observability contract`);
  }
  const dashboard = findDashboard(observabilityContract, persona.modelDashboardName);
  if (
    dashboard.capability !== 'shipped' ||
    !persona.visibleDashboardNames.includes(dashboard.name) ||
    persona.hiddenDashboardNames.includes(dashboard.name)
  ) {
    throw new Error(`Persona '${persona.id}' cannot access model dashboard '${dashboard.name}'`);
  }
  if (!dashboard.modelSelector) {
    throw new Error(
      `Dashboard '${dashboard.name}' has no model selector in the observability contract`,
    );
  }
  return dashboard;
};

const assertDashboardVisibility = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaContract,
) => {
  const expectedTabCount = observabilityContract.dashboards.filter(
    ({ name, capability }) =>
      capability === 'shipped' &&
      persona.visibleDashboardNames.includes(name) &&
      !persona.hiddenDashboardNames.includes(name),
  ).length;
  observabilityDashboardPage.shouldHaveTabCount(expectedTabCount);

  observabilityContract.dashboards.forEach((dashboard) => {
    if (dashboard.capability === 'environment-blocked') {
      throw new Error(
        `Environment blocked: dashboard '${dashboard.name}' is not available for release stage '${observabilityContract.release.stage}'`,
      );
    }

    const shouldBeVisible =
      dashboard.capability === 'shipped' &&
      persona.visibleDashboardNames.includes(dashboard.name) &&
      !persona.hiddenDashboardNames.includes(dashboard.name);
    if (shouldBeVisible) {
      observabilityDashboardPage.shouldHaveDashboard(dashboard.displayName);
    } else {
      // A not-shipped capability and a persona-restricted dashboard must both be unavailable.
      observabilityDashboardPage.shouldNotHaveDashboard(dashboard.displayName);
    }
  });
};

const assertModelSelector = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaContract,
  dashboard: ObservabilityDashboardContract,
) => {
  const selector = dashboard.modelSelector;
  if (!selector) {
    throw new Error(`Dashboard '${dashboard.name}' has no model selector in the contract`);
  }

  observabilityDashboardPage.findVariable(selector.variableName).should('be.visible');
  observabilityDashboardPage
    .findVariable(selector.variableName)
    .should('contain.text', selector.displayName);
  observabilityDashboardPage.findVariable(selector.namespaceVariableName).should('be.visible');

  selectNamespace(persona.namespaceScope, selector.namespaceVariableName);

  observabilityDashboardPage.findVariableInput(selector.variableName).click();
  observabilityDashboardPage
    .findVariableOptions(selector.variableName)
    .should('contain.text', observabilityContract.fixture.seededModelName);
  observabilityContract.fixture.foreignModelNames.forEach((foreignModelName) => {
    observabilityDashboardPage
      .findVariableOption(selector.variableName, foreignModelName)
      .should('not.exist');
  });
  observabilityDashboardPage
    .findVariableOption(selector.variableName, observabilityContract.fixture.seededModelName)
    .should('be.visible')
    .click();
  observabilityDashboardPage.findVariableInput(selector.variableName).type('{esc}');

  observabilityDashboardPage
    .findVariable(selector.namespaceVariableName)
    .should('contain.text', persona.namespaceScope);
  observabilityDashboardPage
    .findVariable(selector.variableName)
    .should('contain.text', observabilityContract.fixture.seededModelName);
};

const selectNamespace = (namespace: string, namespaceVariableName: string) => {
  observabilityDashboardPage.findVariableInput(namespaceVariableName).click();
  observabilityDashboardPage.findVariableOptions(namespaceVariableName).then(($options) => {
    const selectedOptions = $options
      .toArray()
      .filter((option) => option.getAttribute('aria-selected') === 'true')
      .map((option) => option.textContent.trim());
    if (!selectedOptions.includes(namespace)) {
      observabilityDashboardPage
        .findVariableOption(namespaceVariableName, namespace)
        .should('be.visible')
        .click();
    }
    selectedOptions
      .filter((option) => option !== namespace)
      .forEach((option) => {
        observabilityDashboardPage.findVariableOption(namespaceVariableName, option).click();
      });
  });
  observabilityDashboardPage.findVariableInput(namespaceVariableName).type('{esc}');
  observabilityDashboardPage.shouldHaveSelectedVariable(namespaceVariableName, [namespace]);
};

const assertUnauthorizedNamespace = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaContract,
  dashboard: ObservabilityDashboardContract,
) => {
  if (!persona.unauthorizedNamespaceScope || !dashboard.modelSelector) {
    return;
  }

  const { modelSelector } = dashboard;
  observabilityDashboardPage.beginNetworkObservation();
  selectNamespace(persona.unauthorizedNamespaceScope, modelSelector.namespaceVariableName);

  observabilityDashboardPage.findVariableInput(modelSelector.variableName).click();
  observabilityDashboardPage.shouldHaveUnauthorizedNamespaceResponse(
    observabilityContract.authorization.unauthorizedNamespaceOutcome,
  );
  observabilityDashboardPage.shouldNotHaveVariableOptions(modelSelector.variableName, [
    observabilityContract.fixture.seededModelName,
    ...observabilityContract.fixture.foreignModelNames,
  ]);
  if (observabilityContract.authorization.unauthorizedNamespaceOutcome === 'empty') {
    observabilityDashboardPage.shouldHaveNoVariableOptions(modelSelector.variableName);
  }
  dashboard.panels.forEach((panel) => {
    observabilityDashboardPage.shouldNotRenderValues(
      panel.id,
      panel.displayName,
      observabilityContract.fixture.foreignModelNames,
    );
  });
  observabilityDashboardPage.findVariableInput(modelSelector.variableName).type('{esc}');

  selectNamespace(persona.namespaceScope, modelSelector.namespaceVariableName);
  observabilityDashboardPage.findVariableInput(modelSelector.variableName).click();
  observabilityDashboardPage
    .findVariableOption(modelSelector.variableName, observabilityContract.fixture.seededModelName)
    .should('be.visible')
    .click();
  observabilityDashboardPage.findVariableInput(modelSelector.variableName).type('{esc}');
  observabilityDashboardPage.beginDashboardValidation();
};

const assertDashboardPanels = (dashboard: ObservabilityDashboardContract) => {
  dashboard.panels.forEach((panel) => {
    if (panel.capability === 'environment-blocked') {
      observabilityDashboardPage.recordPanelState(panel.id, 'environment-blocked');
      throw new Error(
        `Environment blocked: panel '${panel.id}' on dashboard '${dashboard.name}' cannot produce UI evidence`,
      );
    }
    if (panel.capability === 'not-shipped') {
      observabilityDashboardPage.shouldNotHavePanel(panel.id, panel.displayName);
      observabilityDashboardPage.recordPanelState(panel.id, 'not-shipped');
      return;
    }
    observabilityDashboardPage.shouldHavePanelState(
      panel.id,
      panel.displayName,
      panel.expectedState ?? 'non-empty',
    );
  });
};

const writeEvidence = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaContract,
  dashboard: ObservabilityDashboardContract,
) => {
  observabilityDashboardPage
    .captureVariableSelections(
      dashboard.modelSelector
        ? [dashboard.modelSelector.namespaceVariableName, dashboard.modelSelector.variableName]
        : [],
    )
    .writeEvidence(observabilityContract.evidence.directory, {
      jiraKey: observabilityContract.jiraKey,
      releaseStage: observabilityContract.release.stage,
      dashboardVersion: observabilityContract.release.dashboardVersion,
      imageVersion: observabilityContract.release.imageVersion,
      persona: persona.id,
      namespaceScope: persona.namespaceScope,
      dashboard: dashboard.name,
      runId: observabilityContract.evidence.runId,
      unauthorizedNamespaceOutcome:
        observabilityContract.authorization.unauthorizedNamespaceOutcome,
      foreignDataMustNotRender: observabilityContract.authorization.foreignDataMustNotRender,
    });
};

if (!contract) {
  describe.skip('Observability dashboard live contract', () => {
    it(
      'requires the opendatahub-tests release handoff',
      { tags: ['@Dashboard', '@Observability'] },
      () => undefined,
    );
  });
} else {
  describe('Observability dashboard live contract', () => {
    let currentPersona: ObservabilityPersonaContract | undefined;
    let currentDashboard: ObservabilityDashboardContract | undefined;
    let evidenceWritten = false;

    before(() => {
      if (!contract.fixture.sourceTelemetryReady) {
        throw new Error(
          `Environment blocked: source telemetry readiness signal '${contract.fixture.readinessSignal}' is not ready`,
        );
      }
    });

    afterEach(() => {
      if (currentPersona && currentDashboard && !evidenceWritten) {
        writeEvidence(contract, currentPersona, currentDashboard);
      }
      currentPersona = undefined;
      currentDashboard = undefined;
      evidenceWritten = false;
    });

    contract.personas.forEach((persona) => {
      it(
        `renders the shipped dashboards for ${persona.id}`,
        { tags: ['@Dashboard', '@Observability'] },
        () => {
          cy.step(`Log in as the configured ${persona.id} persona`);
          observabilityDashboardPage
            .observeNetworkRequests()
            .visitAsPersona(
              persona.id,
              resolveObservabilityCredentials(persona.credentialVariable),
            );

          cy.step('Verify dashboard visibility and frontend filtering');
          assertDashboardVisibility(contract, persona);
          const modelDashboard = persona.modelDashboardName
            ? findModelDashboard(contract, persona)
            : undefined;

          const dashboardsToValidate = contract.dashboards.filter(
            ({ name, capability }) =>
              capability === 'shipped' &&
              persona.visibleDashboardNames.includes(name) &&
              (persona.loadShippedDashboards || name === persona.modelDashboardName),
          );

          observabilityDashboardPage.shouldHaveSuccessfulDashboardRequest();
          cy.wrap(dashboardsToValidate).each((dashboard: ObservabilityDashboardContract) => {
            const dashboardContract = dashboard;
            currentPersona = persona;
            currentDashboard = dashboardContract;
            evidenceWritten = false;
            observabilityDashboardPage.beginDashboardValidation();
            cy.step(`Load the ${dashboardContract.displayName} dashboard through Perses`);
            observabilityDashboardPage.selectDashboard(dashboardContract.displayName);

            if (dashboardContract.name === modelDashboard?.name) {
              cy.step('Verify the authorized namespace and model deployment choices');
              assertModelSelector(contract, persona, dashboardContract);
              assertUnauthorizedNamespace(contract, persona, dashboardContract);
            }

            cy.step('Verify shipped panel states and release capabilities');
            observabilityDashboardPage.shouldHaveSuccessfulRequests();
            assertDashboardPanels(dashboardContract);
            writeEvidence(contract, persona, dashboardContract);
            cy.then(() => {
              evidenceWritten = true;
            });
          });
        },
      );
    });
  });
}
