import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_ADMIN_USER,
  LDAP_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '../../../utils/e2eUsers';
import { retryableBefore } from '../../../utils/retryableHooks';
import { observabilityDashboardPage } from '../../../pages/observabilityDashboard';
import {
  getApplicableObservabilityRecords,
  getAuthorizationOutcomeForRecords,
  loadLocalObservabilityDashboards,
  loadObservabilityContract,
  loadObservabilityFixtureConfig,
  LOCAL_OBSERVABILITY_PANEL_IDS,
  LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS,
  LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS,
  LOCAL_OBSERVABILITY_STATIC_PANEL_IDS,
  LOCAL_OBSERVABILITY_UNCONTRACTED_PANEL_IDS,
  LOCAL_OBSERVABILITY_SELECTOR_RECORD,
  resolveObservabilityCredentials,
  type LocalObservabilityDashboard,
  type ObservabilityContract,
  type ObservabilityFixtureConfig,
  type ObservabilityPersonaFixture,
  type ObservabilityRecord,
  validateObservabilityFixtureConfig,
  validateRequiredDashboardRecords,
} from '../../../utils/observabilityContract';

const OBSERVABILITY_CREDENTIALS = {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_ADMIN_USER,
  LDAP_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
};

const contract = loadObservabilityContract();
const fixtures = loadObservabilityFixtureConfig();
const localDashboards = loadLocalObservabilityDashboards();

const findLocalDashboard = (
  dashboards: LocalObservabilityDashboard[],
  contractName: string,
): LocalObservabilityDashboard => {
  const dashboard = dashboards.find(({ contractName: name }) => name === contractName);
  if (!dashboard) {
    throw new Error(
      `Dashboard manifest for contract dashboard '${contractName}' is not available in this repository`,
    );
  }
  return dashboard;
};

const findRecord = (
  observabilityContract: ObservabilityContract,
  recordId: string,
): ObservabilityRecord => {
  const record = getApplicableObservabilityRecords(observabilityContract).find(
    ({ id }) => id === recordId,
  );
  if (!record) {
    throw new Error(
      `Applicable observability release contract record '${recordId}' is missing for stage '${observabilityContract.releaseStage}'`,
    );
  }
  return record;
};

const getDashboardRecords = (
  observabilityContract: ObservabilityContract,
  dashboardName: string,
): ObservabilityRecord[] =>
  getApplicableObservabilityRecords(observabilityContract).filter(
    ({ dashboard }) => dashboard === dashboardName,
  );

const getMappedPanelRecords = (
  observabilityContract: ObservabilityContract,
  dashboardName: string,
): Array<{ record: ObservabilityRecord; panelId: string }> => {
  const panelMappings = LOCAL_OBSERVABILITY_PANEL_IDS[dashboardName];
  if (!panelMappings) {
    throw new Error(`No dashboard-local panel mapping exists for '${dashboardName}'`);
  }
  return Object.entries(panelMappings).map(([recordId, panelId]) => ({
    record: findRecord(observabilityContract, recordId),
    panelId,
  }));
};

const assertLocalContractAlignment = (
  observabilityContract: ObservabilityContract,
  dashboards: LocalObservabilityDashboard[],
  fixtureConfig: ObservabilityFixtureConfig,
) => {
  validateRequiredDashboardRecords(observabilityContract);
  validateObservabilityFixtureConfig(fixtureConfig, dashboards, observabilityContract);
  Object.entries(LOCAL_OBSERVABILITY_PANEL_IDS).forEach(([dashboardName, panelMappings]) => {
    if (!panelMappings) {
      throw new Error(`No dashboard-local panel mapping exists for '${dashboardName}'`);
    }
    const dashboard = findLocalDashboard(dashboards, dashboardName);
    const panelIds = Object.values(panelMappings);
    if (new Set(panelIds).size !== panelIds.length) {
      throw new Error(
        `Dashboard-local panel mappings for '${dashboardName}' must not map multiple contract records to the same panel`,
      );
    }
    Object.entries(panelMappings).forEach(([recordId, panelId]) => {
      const record = findRecord(observabilityContract, recordId);
      if (record.dashboard !== dashboardName) {
        throw new Error(
          `Observability record '${recordId}' belongs to '${record.dashboard}', not '${dashboardName}'`,
        );
      }
      if (record.id !== `${dashboardName}-${record.panel}`) {
        throw new Error(
          `Observability record '${recordId}' does not use the stable '${dashboardName}/${record.panel}' panel identifier`,
        );
      }
      if (!dashboard.panelIds.includes(panelId)) {
        throw new Error(
          `Observability record '${recordId}' maps to panel '${panelId}', which is absent from the checked-in '${dashboardName}' dashboard manifest`,
        );
      }
      if (record.capability === 'not-shipped') {
        throw new Error(
          `Observability contract marks '${recordId}' as not-shipped, but the checked-in '${dashboardName}' dashboard still exposes panel '${panelId}'`,
        );
      }
    });
  });

  Object.entries(LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS).forEach(
    ([dashboardName, panelMappings]) => {
      const dashboard = findLocalDashboard(dashboards, dashboardName);
      Object.entries(panelMappings).forEach(([recordId, panelId]) => {
        const record = findRecord(observabilityContract, recordId);
        if (record.dashboard !== dashboardName || record.capability !== 'not-shipped') {
          throw new Error(
            `Observability record '${recordId}' is not a not-shipped '${dashboardName}' dashboard record`,
          );
        }
        if (dashboard.panelIds.includes(panelId)) {
          throw new Error(
            `Observability contract marks '${recordId}' as not-shipped, but the checked-in '${dashboardName}' dashboard still exposes panel '${panelId}'`,
          );
        }
      });
    },
  );

  Object.entries(LOCAL_OBSERVABILITY_UNCONTRACTED_PANEL_IDS).forEach(
    ([dashboardName, panelIds]) => {
      const dashboard = findLocalDashboard(dashboards, dashboardName);
      const mappedPanelIds = new Set([
        ...Object.values(LOCAL_OBSERVABILITY_PANEL_IDS[dashboardName] ?? {}),
        ...Object.values(LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS[dashboardName] ?? {}),
      ]);
      panelIds.forEach((panelId) => {
        if (!dashboard.panelIds.includes(panelId)) {
          throw new Error(
            `Uncontracted observability panel '${panelId}' is absent from the checked-in '${dashboardName}' dashboard manifest`,
          );
        }
        if (mappedPanelIds.has(panelId)) {
          throw new Error(
            `Observability panel '${panelId}' cannot be both contract-mapped and uncontracted`,
          );
        }
      });
    },
  );

  Object.entries(LOCAL_OBSERVABILITY_PANEL_IDS).forEach(([dashboardName, panelMappings]) => {
    const dashboard = findLocalDashboard(dashboards, dashboardName);
    const classifiedPanelIds = new Set([
      ...Object.values(panelMappings ?? {}),
      ...Object.values(LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS[dashboardName] ?? {}),
      ...(LOCAL_OBSERVABILITY_UNCONTRACTED_PANEL_IDS[dashboardName] ?? []),
      ...(LOCAL_OBSERVABILITY_STATIC_PANEL_IDS[dashboardName] ?? []),
    ]);
    const unclassifiedPanelIds = dashboard.panelIds.filter(
      (panelId) => !classifiedPanelIds.has(panelId),
    );
    if (unclassifiedPanelIds.length > 0) {
      throw new Error(
        `Observability panels for '${dashboardName}' are not classified: ${unclassifiedPanelIds.join(
          ', ',
        )}`,
      );
    }
  });

  const selectorRecord = findRecord(observabilityContract, LOCAL_OBSERVABILITY_SELECTOR_RECORD);
  if (selectorRecord.dashboard !== 'models') {
    throw new Error(
      `Observability selector record '${LOCAL_OBSERVABILITY_SELECTOR_RECORD}' must belong to the models dashboard`,
    );
  }
  const modelsDashboard = findLocalDashboard(dashboards, 'models');
  if (
    selectorRecord.capability === 'shipped' &&
    (!modelsDashboard.variables.some(({ name }) => name === 'namespace') ||
      !modelsDashboard.variables.some(({ name }) => name === 'model_name'))
  ) {
    throw new Error(
      "The checked-in models dashboard manifest must expose both 'namespace' and 'model_name' variables for the shipped selector contract",
    );
  }
};

const assertDashboardVisibility = (
  dashboards: LocalObservabilityDashboard[],
  persona: ObservabilityPersonaFixture,
) => {
  const expectedVisibleDashboards = dashboards.filter(
    ({ contractName }) =>
      persona.visibleDashboardNames.includes(contractName) &&
      !persona.hiddenDashboardNames.includes(contractName),
  );
  observabilityDashboardPage.shouldHaveTabCount(expectedVisibleDashboards.length);
  cy.wrap(dashboards, { log: false }).each((dashboard: LocalObservabilityDashboard) => {
    const shouldBeVisible =
      persona.visibleDashboardNames.includes(dashboard.contractName) &&
      !persona.hiddenDashboardNames.includes(dashboard.contractName);
    if (shouldBeVisible) {
      observabilityDashboardPage.shouldHaveDashboard(dashboard.displayName);
    } else {
      observabilityDashboardPage.shouldNotHaveDashboard(dashboard.displayName);
    }
  });
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
    cy.wrap(
      selectedOptions.filter((option) => option !== namespace),
      { log: false },
    ).each((option: string) => {
      observabilityDashboardPage.findVariableOption(namespaceVariableName, option).click();
    });
  });
  observabilityDashboardPage.findVariableInput(namespaceVariableName).type('{esc}');
  observabilityDashboardPage.shouldHaveSelectedVariable(namespaceVariableName, [namespace]);
};

const assertModelSelector = (
  observabilityContract: ObservabilityContract,
  localModelsDashboard: LocalObservabilityDashboard,
  fixtureConfig: ObservabilityFixtureConfig,
  persona: ObservabilityPersonaFixture,
) => {
  const selectorRecord = findRecord(observabilityContract, LOCAL_OBSERVABILITY_SELECTOR_RECORD);
  if (selectorRecord.capability === 'environment-blocked') {
    throw new Error(
      `Environment blocked: model selector '${LOCAL_OBSERVABILITY_SELECTOR_RECORD}' cannot produce UI evidence`,
    );
  }
  if (selectorRecord.capability === 'not-shipped') {
    const modelVariable = localModelsDashboard.variables.find(({ name }) => name === 'model_name');
    if (modelVariable) {
      observabilityDashboardPage.findVariable(modelVariable.name).should('not.exist');
    }
    return;
  }
  const namespaceVariable = localModelsDashboard.variables.find(({ name }) => name === 'namespace');
  const modelVariable = localModelsDashboard.variables.find(({ name }) => name === 'model_name');
  if (!namespaceVariable || !modelVariable) {
    throw new Error(
      'The checked-in models dashboard manifest is missing the model selector variables',
    );
  }

  observabilityDashboardPage.findVariable(modelVariable.name).should('be.visible');
  if (modelVariable.displayName) {
    observabilityDashboardPage
      .findVariable(modelVariable.name)
      .should('contain.text', modelVariable.displayName);
  }
  observabilityDashboardPage.findVariable(namespaceVariable.name).should('be.visible');
  selectNamespace(persona.namespaceScope, namespaceVariable.name);

  observabilityDashboardPage.findVariableInput(modelVariable.name).click();
  observabilityDashboardPage
    .findVariableOptions(modelVariable.name)
    .should('contain.text', fixtureConfig.seededModelName);
  cy.wrap(fixtureConfig.foreignModelNames, { log: false }).each((foreignModelName: string) => {
    observabilityDashboardPage
      .findVariableOption(modelVariable.name, foreignModelName)
      .should('not.exist');
  });
  observabilityDashboardPage
    .findVariableOption(modelVariable.name, fixtureConfig.seededModelName)
    .should('be.visible')
    .click();
  observabilityDashboardPage.findVariableInput(modelVariable.name).type('{esc}');
  observabilityDashboardPage
    .findVariable(namespaceVariable.name)
    .should('contain.text', persona.namespaceScope);
  observabilityDashboardPage
    .findVariable(modelVariable.name)
    .should('contain.text', fixtureConfig.seededModelName);
};

const assertUnauthorizedNamespace = (
  observabilityContract: ObservabilityContract,
  fixtureConfig: ObservabilityFixtureConfig,
  persona: ObservabilityPersonaFixture,
  localModelsDashboard: LocalObservabilityDashboard,
) => {
  if (!persona.unauthorizedNamespaceScope) {
    return;
  }
  const modelAuthorizationRecordIds = LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS.models;
  const modelAuthorizationRecords = getApplicableObservabilityRecords(observabilityContract).filter(
    ({ id }) => modelAuthorizationRecordIds.includes(id),
  );
  const authorizationOutcome = getAuthorizationOutcomeForRecords(
    observabilityContract,
    modelAuthorizationRecordIds,
  );
  if (modelAuthorizationRecords.length === 0) {
    throw new Error(
      'Unauthorized namespace validation requires at least one applicable authorization record',
    );
  }
  if (modelAuthorizationRecords.some(({ capability }) => capability !== 'shipped')) {
    throw new Error('Unauthorized namespace validation requires shipped authorization records');
  }
  if (!authorizationOutcome || authorizationOutcome === 'not-applicable') {
    throw new Error('Unauthorized namespace validation requires an explicit authorization outcome');
  }
  if (authorizationOutcome === 'review-required') {
    throw new Error(
      'Unauthorized namespace validation is blocked because the release contract requires authorization review',
    );
  }
  const namespaceVariable = localModelsDashboard.variables.find(({ name }) => name === 'namespace');
  const modelVariable = localModelsDashboard.variables.find(({ name }) => name === 'model_name');
  if (!namespaceVariable || !modelVariable) {
    throw new Error(
      'The checked-in models dashboard manifest is missing the model selector variables',
    );
  }

  observabilityDashboardPage.beginNetworkObservation(persona.unauthorizedNamespaceScope);
  selectNamespace(persona.unauthorizedNamespaceScope, namespaceVariable.name);
  observabilityDashboardPage.findVariableInput(modelVariable.name).click();
  observabilityDashboardPage.shouldHaveUnauthorizedNamespaceResponse(
    authorizationOutcome,
    modelVariable.name,
  );
  observabilityDashboardPage.shouldNotHaveVariableOptions(modelVariable.name, [
    fixtureConfig.seededModelName,
    ...fixtureConfig.foreignModelNames,
  ]);
  if (authorizationOutcome === 'success-empty') {
    observabilityDashboardPage.shouldHaveNoVariableOptions(modelVariable.name);
  }
  cy.wrap(
    getMappedPanelRecords(observabilityContract, 'models').filter(
      ({ record }) => record.capability === 'shipped',
    ),
    { log: false },
  ).each(({ panelId }: { panelId: string }) => {
    observabilityDashboardPage.shouldNotRenderValues(
      panelId,
      fixtureConfig.foreignModelNames,
      localModelsDashboard.panelDisplayNames[panelId],
    );
  });
  observabilityDashboardPage.findVariableInput(modelVariable.name).type('{esc}');
  observabilityDashboardPage.recordObservationEvidence();
  selectNamespace(persona.namespaceScope, namespaceVariable.name);
};

const assertDashboardPanels = (
  observabilityContract: ObservabilityContract,
  dashboard: LocalObservabilityDashboard,
) => {
  cy.wrap(getMappedPanelRecords(observabilityContract, dashboard.contractName), {
    log: false,
  }).each(({ record, panelId }: { record: ObservabilityRecord; panelId: string }) => {
    if (record.capability === 'environment-blocked') {
      observabilityDashboardPage.recordPanelState(panelId, 'environment-blocked');
      throw new Error(
        `Environment blocked: panel '${record.id}' on dashboard '${dashboard.contractName}' cannot produce UI evidence`,
      );
    }
    if (record.capability === 'not-shipped') {
      observabilityDashboardPage.shouldNotHavePanel(panelId, dashboard.panelDisplayNames[panelId]);
      observabilityDashboardPage.recordPanelState(panelId, 'not-shipped');
      return;
    }
    observabilityDashboardPage.shouldHavePanelState(
      panelId,
      dashboard.panelDisplayNames[panelId],
      record.emptyResultValid ? 'valid-empty' : 'non-empty',
      record.emptyUiState,
    );
  });

  cy.wrap(LOCAL_OBSERVABILITY_UNCONTRACTED_PANEL_IDS[dashboard.contractName] ?? [], {
    log: false,
  }).each((panelId: string) => {
    if ((LOCAL_OBSERVABILITY_STATIC_PANEL_IDS[dashboard.contractName] ?? []).includes(panelId)) {
      observabilityDashboardPage.shouldHaveRenderedPanel(
        panelId,
        dashboard.panelDisplayNames[panelId],
      );
    } else {
      observabilityDashboardPage.shouldHavePanelState(
        panelId,
        dashboard.panelDisplayNames[panelId],
        'valid-empty',
      );
    }
  });
};

const writeEvidence = (
  observabilityContract: ObservabilityContract,
  persona: ObservabilityPersonaFixture,
  dashboard: LocalObservabilityDashboard,
) => {
  const evidenceDirectory = `${Cypress.env('CY_RESULTS_DIR') || 'results'}/e2e/observability`;
  const runId = Cypress.env('BUILD_NUMBER') || Cypress.env('GITHUB_RUN_ID') || 'local';
  const authorizationOutcome =
    dashboard.contractName === 'models'
      ? getAuthorizationOutcomeForRecords(
          observabilityContract,
          LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS.models,
        )
      : undefined;
  const authorizationContractRecordIds =
    dashboard.contractName === 'models' ? LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS.models : [];
  observabilityDashboardPage
    .captureVariableSelections(
      dashboard.variables
        .filter(({ name }) => name === 'namespace' || name === 'model_name')
        .map(({ name }) => name),
    )
    .writeEvidence(evidenceDirectory, {
      jiraKey: observabilityContract.jiraKey,
      contractVersion: observabilityContract.contractVersion,
      contractRef: Cypress.env('OBSERVABILITY_CONTRACT_REF') || 'local-file',
      contractSource:
        Cypress.env('OBSERVABILITY_CONTRACT_SOURCE') ||
        'opendatahub-tests/tests/observability/contracts/release_contract.yaml',
      releaseStage: observabilityContract.releaseStage,
      persona: persona.id,
      namespaceScope: persona.namespaceScope,
      dashboard: dashboard.contractName,
      contractRecordIds: [
        ...new Set([
          ...getDashboardRecords(observabilityContract, dashboard.contractName).map(({ id }) => id),
          ...authorizationContractRecordIds,
        ]),
      ],
      runId,
      ...(persona.unauthorizedNamespaceScope
        ? { unauthorizedNamespaceScope: persona.unauthorizedNamespaceScope }
        : {}),
      ...(authorizationContractRecordIds.length > 0 ? { authorizationContractRecordIds } : {}),
      ...(authorizationOutcome ? { unauthorizedNamespaceOutcome: authorizationOutcome } : {}),
      foreignDataMustNotRender: true,
      clusterOwnership: 'dashboard-job-local',
    });
};

if (!contract || !fixtures || !localDashboards) {
  throw new Error(
    'The observability live suite requires a fetched release contract, dashboard-local fixtures, and checked-in dashboard metadata',
  );
}

assertLocalContractAlignment(contract, localDashboards, fixtures);

describe('Observability dashboard live contract', () => {
  let currentPersona: ObservabilityPersonaFixture | undefined;
  let currentDashboard: LocalObservabilityDashboard | undefined;
  let evidenceWritten = false;

  retryableBefore(() => {
    if (
      !getApplicableObservabilityRecords(contract).some(
        ({ capability }) => capability === 'shipped',
      )
    ) {
      throw new Error(
        `Environment blocked: release stage '${contract.releaseStage}' has no shipped observability records for dashboard validation`,
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

  fixtures.personas.forEach((persona) => {
    it(
      `renders the shipped dashboards for ${persona.id}`,
      { tags: ['@Dashboard', '@Observability'] },
      () => {
        cy.step(`Log in as the configured ${persona.id} persona`);
        observabilityDashboardPage
          .observeNetworkRequests()
          .visitAsPersona(
            persona.id,
            resolveObservabilityCredentials(persona.credentialVariable, OBSERVABILITY_CREDENTIALS),
          );

        cy.step('Verify dashboard visibility and frontend filtering');
        assertDashboardVisibility(localDashboards, persona);
        observabilityDashboardPage.shouldHaveSuccessfulDashboardRequest();

        cy.wrap(
          localDashboards.filter(
            ({ contractName }) =>
              persona.visibleDashboardNames.includes(contractName) &&
              !persona.hiddenDashboardNames.includes(contractName),
          ),
          { log: false },
        ).each((dashboard: LocalObservabilityDashboard) => {
          currentPersona = persona;
          currentDashboard = dashboard;
          evidenceWritten = false;
          observabilityDashboardPage.beginDashboardValidation();
          cy.step(`Load the ${dashboard.displayName} dashboard through Perses`);
          observabilityDashboardPage.selectDashboard(dashboard.displayName);

          const dashboardRecords = getDashboardRecords(contract, dashboard.contractName);
          const requiresData = getMappedPanelRecords(contract, dashboard.contractName).some(
            ({ record }) => record.capability === 'shipped' && !record.emptyResultValid,
          );
          observabilityDashboardPage.shouldHaveSuccessfulRequests(
            dashboardRecords,
            requiresData,
            dashboard.contractName === 'models' ? persona.namespaceScope : undefined,
          );

          if (dashboard.contractName === 'models') {
            if (dashboardRecords.some(({ id }) => id === LOCAL_OBSERVABILITY_SELECTOR_RECORD)) {
              cy.step('Verify the authorized namespace and model deployment choices');
              assertModelSelector(contract, dashboard, fixtures, persona);
              assertUnauthorizedNamespace(contract, fixtures, persona, dashboard);
            }
          }

          cy.step('Verify shipped panel states and release capabilities');
          assertDashboardPanels(contract, dashboard);
          writeEvidence(contract, persona, dashboard);
          cy.then(() => {
            evidenceWritten = true;
          });
        });
      },
    );
  });
});
