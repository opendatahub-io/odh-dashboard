export type CapabilityState = 'shipped' | 'not-shipped' | 'environment-blocked';

export type PanelExpectedState = 'non-empty' | 'valid-empty';

export type UnauthorizedNamespaceOutcome = 'forbidden' | 'empty' | 'filtered';

export type ObservabilityPanelContract = {
  id: string;
  displayName: string;
  capability: CapabilityState;
  expectedState?: PanelExpectedState;
};

export type ObservabilityModelSelectorContract = {
  variableName: string;
  displayName: string;
  namespaceVariableName: string;
};

export type ObservabilityDashboardContract = {
  name: string;
  displayName: string;
  capability: CapabilityState;
  panels: ObservabilityPanelContract[];
  modelSelector?: ObservabilityModelSelectorContract;
};

export type ObservabilityPersonaContract = {
  id: string;
  credentialVariable: string;
  namespaceScope: string;
  unauthorizedNamespaceScope?: string;
  visibleDashboardNames: string[];
  hiddenDashboardNames: string[];
  loadShippedDashboards: boolean;
  modelDashboardName?: string;
};

export type ObservabilityContract = {
  jiraKey: string;
  release: {
    stage: string;
    dashboardVersion: string;
    imageVersion: string;
  };
  fixture: {
    namespaceA: string;
    namespaceB: string;
    seededModelName: string;
    foreignModelNames: string[];
    sourceTelemetryReady: boolean;
    readinessSignal: string;
  };
  authorization: {
    unauthorizedNamespaceOutcome: UnauthorizedNamespaceOutcome;
    foreignDataMustNotRender: true;
  };
  dashboards: ObservabilityDashboardContract[];
  personas: ObservabilityPersonaContract[];
  evidence: {
    directory: string;
    runId: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredRecord = (value: Record<string, unknown>, key: string, path: string) => {
  const result = value[key];
  if (!isRecord(result)) {
    throw new Error(`Observability contract field '${path}.${key}' must be an object`);
  }
  return result;
};

const requiredString = (value: Record<string, unknown>, key: string, path: string): string => {
  const result = value[key];
  if (typeof result !== 'string' || result.trim().length === 0) {
    throw new Error(`Observability contract field '${path}.${key}' must be a non-empty string`);
  }
  return result;
};

const requiredBoolean = (value: Record<string, unknown>, key: string, path: string): boolean => {
  const result = value[key];
  if (typeof result !== 'boolean') {
    throw new Error(`Observability contract field '${path}.${key}' must be a boolean`);
  }
  return result;
};

const requiredStringArray = (
  value: Record<string, unknown>,
  key: string,
  path: string,
): string[] => {
  const result = value[key];
  if (
    !Array.isArray(result) ||
    !result.every((item): item is string => typeof item === 'string' && item.trim().length > 0)
  ) {
    throw new Error(`Observability contract field '${path}.${key}' must be an array of strings`);
  }
  return result;
};

const assertUnique = (values: string[], description: string) => {
  if (new Set(values).size !== values.length) {
    throw new Error(`Observability contract ${description} must be unique`);
  }
};

const parseCapability = (value: unknown, path: string): CapabilityState => {
  if (value !== 'shipped' && value !== 'not-shipped' && value !== 'environment-blocked') {
    throw new Error(
      `Observability contract field '${path}' must be shipped, not-shipped, or environment-blocked`,
    );
  }
  return value;
};

const parsePanel = (value: unknown, index: number): ObservabilityPanelContract => {
  const path = `dashboards[].panels[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Observability contract field '${path}' must be an object`);
  }
  const { capability: rawCapability, expectedState } = value;
  const capability = parseCapability(rawCapability, `${path}.capability`);
  if (
    expectedState !== undefined &&
    expectedState !== 'non-empty' &&
    expectedState !== 'valid-empty'
  ) {
    throw new Error(`Observability contract field '${path}.expectedState' is invalid`);
  }
  if (capability === 'shipped' && expectedState === undefined) {
    throw new Error(`Shipped panel '${path}' must declare expectedState`);
  }
  return {
    id: requiredString(value, 'id', path),
    displayName: requiredString(value, 'displayName', path),
    capability,
    expectedState,
  };
};

const parseDashboard = (value: unknown, index: number): ObservabilityDashboardContract => {
  const path = `dashboards[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Observability contract field '${path}' must be an object`);
  }
  const { panels, modelSelector } = value;
  if (!Array.isArray(panels)) {
    throw new Error(`Observability contract field '${path}.panels' must be an array`);
  }
  const capability = parseCapability(value.capability, `${path}.capability`);
  if (capability === 'shipped' && panels.length === 0) {
    throw new Error(`Shipped dashboard '${path}' must declare at least one panel`);
  }
  let parsedModelSelector: ObservabilityModelSelectorContract | undefined;
  if (modelSelector !== undefined) {
    if (!isRecord(modelSelector)) {
      throw new Error(`Observability contract field '${path}.modelSelector' must be an object`);
    }
    parsedModelSelector = {
      variableName: requiredString(modelSelector, 'variableName', `${path}.modelSelector`),
      displayName: requiredString(modelSelector, 'displayName', `${path}.modelSelector`),
      namespaceVariableName: requiredString(
        modelSelector,
        'namespaceVariableName',
        `${path}.modelSelector`,
      ),
    };
  }
  const parsedPanels = panels.map(parsePanel);
  assertUnique(
    parsedPanels.map(({ id }) => id),
    `${path}.panel ids`,
  );
  assertUnique(
    parsedPanels.map(({ displayName }) => displayName),
    `${path}.panel display names`,
  );
  return {
    name: requiredString(value, 'name', path),
    displayName: requiredString(value, 'displayName', path),
    capability,
    panels: parsedPanels,
    modelSelector: parsedModelSelector,
  };
};

const parsePersona = (value: unknown, index: number): ObservabilityPersonaContract => {
  const path = `personas[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Observability contract field '${path}' must be an object`);
  }
  return {
    id: requiredString(value, 'id', path),
    credentialVariable: requiredString(value, 'credentialVariable', path),
    namespaceScope: requiredString(value, 'namespaceScope', path),
    ...(value.unauthorizedNamespaceScope !== undefined
      ? {
          unauthorizedNamespaceScope: requiredString(value, 'unauthorizedNamespaceScope', path),
        }
      : {}),
    visibleDashboardNames: requiredStringArray(value, 'visibleDashboardNames', path),
    hiddenDashboardNames: requiredStringArray(value, 'hiddenDashboardNames', path),
    loadShippedDashboards: requiredBoolean(value, 'loadShippedDashboards', path),
    ...(value.modelDashboardName !== undefined
      ? { modelDashboardName: requiredString(value, 'modelDashboardName', path) }
      : {}),
  };
};

export const validateEvidenceDirectory = (directory: string): string => {
  const normalized = directory.replaceAll('\\', '/');
  if (
    normalized.length === 0 ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split('/').some((part) => part === '..')
  ) {
    throw new Error(
      'Observability evidence directory must be a relative path without traversal or an absolute path',
    );
  }
  return normalized.replace(/\/+$/, '');
};

export const parseObservabilityContract = (value: unknown): ObservabilityContract => {
  if (!isRecord(value)) {
    throw new Error('Observability contract must be a JSON object');
  }
  const release = requiredRecord(value, 'release', 'contract');
  const fixture = requiredRecord(value, 'fixture', 'contract');
  const authorization = requiredRecord(value, 'authorization', 'contract');
  const { dashboards, personas } = value;
  if (!Array.isArray(dashboards) || dashboards.length === 0) {
    throw new Error("Observability contract field 'contract.dashboards' must be a non-empty array");
  }
  if (!Array.isArray(personas) || personas.length === 0) {
    throw new Error("Observability contract field 'contract.personas' must be a non-empty array");
  }
  const outcome = authorization.unauthorizedNamespaceOutcome;
  if (outcome !== 'forbidden' && outcome !== 'empty' && outcome !== 'filtered') {
    throw new Error(
      "Observability contract field 'contract.authorization.unauthorizedNamespaceOutcome' is invalid",
    );
  }
  if (authorization.foreignDataMustNotRender !== true) {
    throw new Error(
      "Observability contract field 'contract.authorization.foreignDataMustNotRender' must be true",
    );
  }

  const parsedFixture = {
    namespaceA: requiredString(fixture, 'namespaceA', 'contract.fixture'),
    namespaceB: requiredString(fixture, 'namespaceB', 'contract.fixture'),
    seededModelName: requiredString(fixture, 'seededModelName', 'contract.fixture'),
    foreignModelNames: requiredStringArray(fixture, 'foreignModelNames', 'contract.fixture'),
    sourceTelemetryReady: requiredBoolean(fixture, 'sourceTelemetryReady', 'contract.fixture'),
    readinessSignal: requiredString(fixture, 'readinessSignal', 'contract.fixture'),
  };
  if (parsedFixture.namespaceA === parsedFixture.namespaceB) {
    throw new Error('Observability fixture namespaces must be different');
  }
  if (parsedFixture.foreignModelNames.length === 0) {
    throw new Error('Observability fixture must declare at least one foreign model');
  }

  const parsedDashboards = dashboards.map(parseDashboard);
  assertUnique(
    parsedDashboards.map(({ name }) => name),
    'dashboard names',
  );
  assertUnique(
    parsedDashboards.map(({ displayName }) => displayName),
    'dashboard display names',
  );
  const dashboardByName = new Map(parsedDashboards.map((dashboard) => [dashboard.name, dashboard]));
  const parsedPersonas = personas.map(parsePersona);
  assertUnique(
    parsedPersonas.map(({ id }) => id),
    'persona ids',
  );

  parsedPersonas.forEach((persona, index) => {
    const path = `personas[${index}]`;
    assertUnique(persona.visibleDashboardNames, `${path}.visibleDashboardNames`);
    assertUnique(persona.hiddenDashboardNames, `${path}.hiddenDashboardNames`);
    const hiddenNames = new Set(persona.hiddenDashboardNames);
    if (persona.visibleDashboardNames.some((name) => hiddenNames.has(name))) {
      throw new Error(
        `Observability contract persona '${persona.id}' cannot both show and hide a dashboard`,
      );
    }
    [...persona.visibleDashboardNames, ...persona.hiddenDashboardNames].forEach((name) => {
      if (!dashboardByName.has(name)) {
        throw new Error(
          `Observability persona '${persona.id}' references unknown dashboard '${name}'`,
        );
      }
    });
    if (!persona.loadShippedDashboards && !persona.modelDashboardName) {
      throw new Error(
        `Observability persona '${persona.id}' must validate at least one shipped dashboard`,
      );
    }
    if (persona.loadShippedDashboards) {
      const visibleShippedDashboard = persona.visibleDashboardNames.some(
        (name) => dashboardByName.get(name)?.capability === 'shipped',
      );
      if (!visibleShippedDashboard) {
        throw new Error(
          `Observability persona '${persona.id}' must validate at least one shipped dashboard`,
        );
      }
    }
    if (persona.modelDashboardName) {
      const modelDashboard = dashboardByName.get(persona.modelDashboardName);
      if (
        !modelDashboard ||
        modelDashboard.capability !== 'shipped' ||
        !persona.visibleDashboardNames.includes(persona.modelDashboardName) ||
        !modelDashboard.modelSelector
      ) {
        throw new Error(
          `Observability persona '${persona.id}' has an invalid model dashboard '${persona.modelDashboardName}'`,
        );
      }
    }
    if (persona.unauthorizedNamespaceScope !== undefined) {
      if (!persona.modelDashboardName) {
        throw new Error(
          `Observability persona '${persona.id}' must declare a model dashboard for unauthorized namespace validation`,
        );
      }
      if (persona.namespaceScope !== parsedFixture.namespaceA) {
        throw new Error(
          `Observability persona '${persona.id}' authorized namespace must match fixture.namespaceA`,
        );
      }
      if (persona.unauthorizedNamespaceScope === persona.namespaceScope) {
        throw new Error(
          `Observability persona '${persona.id}' must use a different unauthorized namespace`,
        );
      }
      if (persona.unauthorizedNamespaceScope !== parsedFixture.namespaceB) {
        throw new Error(
          `Observability persona '${persona.id}' unauthorized namespace must match fixture.namespaceB`,
        );
      }
    }
  });
  if (!parsedPersonas.some(({ unauthorizedNamespaceScope }) => unauthorizedNamespaceScope)) {
    throw new Error('Observability contract must include an unauthorized namespace scenario');
  }

  return {
    jiraKey: requiredString(value, 'jiraKey', 'contract'),
    release: {
      stage: requiredString(release, 'stage', 'contract.release'),
      dashboardVersion: requiredString(release, 'dashboardVersion', 'contract.release'),
      imageVersion: requiredString(release, 'imageVersion', 'contract.release'),
    },
    fixture: parsedFixture,
    authorization: {
      unauthorizedNamespaceOutcome: outcome,
      foreignDataMustNotRender: true,
    },
    dashboards: parsedDashboards,
    personas: parsedPersonas,
    evidence: (() => {
      const evidence = requiredRecord(value, 'evidence', 'contract');
      return {
        directory: validateEvidenceDirectory(
          requiredString(evidence, 'directory', 'contract.evidence'),
        ),
        runId: requiredString(evidence, 'runId', 'contract.evidence'),
      };
    })(),
  };
};
