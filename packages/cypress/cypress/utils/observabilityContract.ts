import YAML from 'js-yaml';

export type CapabilityState = 'shipped' | 'not-shipped' | 'environment-blocked';

const AUTHORIZATION_RESPONSE_VALUES = [
  'not-applicable',
  '403',
  '404',
  'success-empty',
  'success-filtered',
  'isolation-only',
  'review-required',
] as const;

export type AuthorizationResponse = (typeof AUTHORIZATION_RESPONSE_VALUES)[number];

export type UnauthorizedNamespaceOutcome = Exclude<
  AuthorizationResponse,
  'not-applicable' | 'review-required'
>;

export type ObservabilityTimeRange = Record<string, string | number>;

export type ObservabilityRecord = {
  id: string;
  releaseStage: string;
  dashboard: string;
  panel: string;
  datasource: string;
  route: string;
  promql: string;
  timeRange: ObservabilityTimeRange;
  expectedHttpStatus: number[];
  expectedPrometheusStatus: string;
  expectedResultType: string;
  minimumSeries: number;
  requiredLabels: string[];
  emptyResultValid: boolean;
  emptyUiState: string;
  capability: CapabilityState;
  authorizationResponse: AuthorizationResponse;
  warningsAllowed: boolean;
};

export type ObservabilityContract = {
  contractVersion: string;
  releaseStage: string;
  productVersions: Record<string, string>;
  defaultTimeRange: ObservabilityTimeRange;
  jiraKey: string;
  records: ObservabilityRecord[];
};

const OBSERVABILITY_JIRA_KEY = 'RHOAIENG-96476';
const RELEASE_STAGES = new Set(['EA1', 'EA2', 'GA']);
const CONTRACT_KEYS = new Set([
  'contract_version',
  'release_stage',
  'product_versions',
  'default_time_range',
  'records',
]);
const RECORD_KEYS = new Set([
  'id',
  'release_stage',
  'dashboard',
  'panel',
  'datasource',
  'route',
  'promql',
  'time_range',
  'expected_http_status',
  'expected_prometheus_status',
  'expected_result_type',
  'minimum_series',
  'required_labels',
  'empty_result_valid',
  'empty_ui_state',
  'capability',
  'authorization_response',
  'warnings_allowed',
]);
const FIXTURE_KEYS = new Set(['seededModelName', 'foreignModelNames', 'personas']);
const PERSONA_KEYS = new Set([
  'id',
  'credentialVariable',
  'namespaceScope',
  'unauthorizedNamespaceScope',
  'visibleDashboardNames',
  'hiddenDashboardNames',
]);
const isAuthorizationResponse = (value: string): value is AuthorizationResponse =>
  AUTHORIZATION_RESPONSE_VALUES.some((candidate) => candidate === value);

export const validateObservabilityContractRef = (ref: string): string => {
  const normalized = ref.trim();
  if (!/^[a-f0-9]{40}$/i.test(normalized) || normalized !== ref) {
    throw new Error(
      'RHOAI_OBSERVABILITY_CONTRACT_REF must be an immutable 40-character Git commit SHA',
    );
  }
  return normalized;
};

export type ObservabilityPersonaFixture = {
  id: string;
  credentialVariable: string;
  namespaceScope: string;
  unauthorizedNamespaceScope?: string;
  visibleDashboardNames: string[];
  hiddenDashboardNames: string[];
};

export type ObservabilityFixtureConfig = {
  seededModelName: string;
  foreignModelNames: string[];
  personas: ObservabilityPersonaFixture[];
};

export type ObservabilityCredentials = {
  AUTH_TYPE: string;
  USERNAME: string;
  PASSWORD: string;
};

export type LocalObservabilityDashboard = {
  contractName: string;
  displayName: string;
  runtimeNames: string[];
  panelIds: string[];
  panelDisplayNames: Record<string, string>;
  variables: Array<{ name: string; displayName?: string }>;
};

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredString = (value: RecordValue, key: string, path: string): string => {
  const result = value[key];
  if (typeof result !== 'string' || result.trim().length === 0) {
    throw new Error(`Observability contract field '${path}.${key}' must be a non-empty string`);
  }
  return result;
};

const requiredBoolean = (value: RecordValue, key: string, path: string): boolean => {
  const result = value[key];
  if (typeof result !== 'boolean') {
    throw new Error(`Observability contract field '${path}.${key}' must be a boolean`);
  }
  return result;
};

const requiredNumber = (value: RecordValue, key: string, path: string): number => {
  const result = value[key];
  if (
    typeof result !== 'number' ||
    !Number.isFinite(result) ||
    !Number.isInteger(result) ||
    result < 0
  ) {
    throw new Error(`Observability contract field '${path}.${key}' must be a non-negative integer`);
  }
  return result;
};

const requiredStringArray = (value: RecordValue, key: string, path: string): string[] => {
  const result = value[key];
  if (
    !Array.isArray(result) ||
    !result.every((item): item is string => typeof item === 'string' && item.trim().length > 0)
  ) {
    throw new Error(`Observability contract field '${path}.${key}' must be an array of strings`);
  }
  return result;
};

const requiredNumberArray = (value: RecordValue, key: string, path: string): number[] => {
  const result = value[key];
  if (
    !Array.isArray(result) ||
    result.length === 0 ||
    !result.every(
      (item): item is number =>
        typeof item === 'number' && Number.isInteger(item) && item >= 100 && item <= 599,
    )
  ) {
    throw new Error(
      `Observability contract field '${path}.${key}' must be a non-empty array of HTTP status codes`,
    );
  }
  return result;
};

const assertUnique = (values: string[], description: string) => {
  if (new Set(values).size !== values.length) {
    throw new Error(`Observability contract ${description} must be unique`);
  }
};

const rejectUnknownKeys = (value: RecordValue, allowed: Set<string>, path: string) => {
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Observability contract mapping '${path}' contains unsupported fields: ${unknownKeys.join(
        ', ',
      )}`,
    );
  }
};

const parseScalarMapping = (value: unknown, path: string): ObservabilityTimeRange => {
  if (
    !isRecord(value) ||
    !Object.entries(value).every(
      ([key, item]) =>
        typeof key === 'string' &&
        (typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item))),
    )
  ) {
    throw new Error(`Observability contract field '${path}' must be a scalar mapping`);
  }
  const result: ObservabilityTimeRange = {};
  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item))) {
      result[key] = item;
    }
  });
  return result;
};

const parseCapability = (value: unknown, path: string): CapabilityState => {
  if (value !== 'shipped' && value !== 'not-shipped' && value !== 'environment-blocked') {
    throw new Error(
      `Observability contract field '${path}' must be shipped, not-shipped, or environment-blocked`,
    );
  }
  return value;
};

const parseAuthorizationResponse = (value: unknown, path: string): AuthorizationResponse => {
  if (typeof value !== 'string' || !isAuthorizationResponse(value)) {
    throw new Error(
      `Observability contract field '${path}' must be not-applicable, 403, 404, success-empty, success-filtered, isolation-only, or review-required`,
    );
  }
  return value;
};

const parseProductVersions = (value: unknown): Record<string, string> => {
  if (
    !isRecord(value) ||
    !Object.entries(value).every(([key, item]) => key.length > 0 && typeof item === 'string')
  ) {
    throw new Error(
      "Observability contract field 'contract.product_versions' must be a string mapping",
    );
  }
  const result: Record<string, string> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === 'string') {
      result[key] = item;
    }
  });
  return result;
};

const parseRecord = (
  value: unknown,
  index: number,
  releaseStage: string,
  defaultTimeRange: ObservabilityTimeRange,
): ObservabilityRecord => {
  const path = `records[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Observability contract field '${path}' must be an object`);
  }
  rejectUnknownKeys(value, RECORD_KEYS, path);
  const recordStage = value.release_stage ?? releaseStage;
  if (typeof recordStage !== 'string' || !RELEASE_STAGES.has(recordStage)) {
    throw new Error(
      `Observability contract field '${path}.release_stage' has an unsupported release stage`,
    );
  }
  const expectedHttpStatus = requiredNumberArray(value, 'expected_http_status', path);
  assertUnique(expectedHttpStatus.map(String), `${path}.expected_http_status`);
  const requiredLabels = requiredStringArray(value, 'required_labels', path);
  assertUnique(requiredLabels, `${path}.required_labels`);
  const capability = parseCapability(value.capability, `${path}.capability`);
  const emptyResultValid = requiredBoolean(value, 'empty_result_valid', path);
  const emptyUiState = requiredString(value, 'empty_ui_state', path);
  if (
    capability === 'shipped' &&
    emptyResultValid &&
    /not shipped|unavailable/i.test(emptyUiState)
  ) {
    throw new Error(
      `Observability contract field '${path}.empty_ui_state' cannot describe an unavailable shipped capability`,
    );
  }

  return {
    id: requiredString(value, 'id', path),
    releaseStage: recordStage,
    dashboard: requiredString(value, 'dashboard', path),
    panel: requiredString(value, 'panel', path),
    datasource: requiredString(value, 'datasource', path),
    route: requiredString(value, 'route', path),
    promql: requiredString(value, 'promql', path),
    timeRange: parseScalarMapping(
      Object.prototype.hasOwnProperty.call(value, 'time_range')
        ? value.time_range
        : defaultTimeRange,
      `${path}.time_range`,
    ),
    expectedHttpStatus,
    expectedPrometheusStatus: requiredString(value, 'expected_prometheus_status', path),
    expectedResultType: requiredString(value, 'expected_result_type', path),
    minimumSeries: requiredNumber(value, 'minimum_series', path),
    requiredLabels,
    emptyResultValid,
    emptyUiState,
    capability,
    authorizationResponse: parseAuthorizationResponse(
      value.authorization_response,
      `${path}.authorization_response`,
    ),
    warningsAllowed:
      value.warnings_allowed === undefined
        ? false
        : requiredBoolean(value, 'warnings_allowed', path),
  };
};

export const parseObservabilityContract = (value: unknown): ObservabilityContract => {
  if (!isRecord(value)) {
    throw new Error('Observability contract must be a YAML mapping');
  }
  rejectUnknownKeys(value, CONTRACT_KEYS, 'contract');
  const releaseStage = requiredString(value, 'release_stage', 'contract');
  if (!RELEASE_STAGES.has(releaseStage)) {
    throw new Error(
      `Observability contract release_stage must be one of ${[...RELEASE_STAGES].join(', ')}`,
    );
  }
  const { records } = value;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Observability contract field 'contract.records' must be a non-empty array");
  }
  const defaultTimeRange = parseScalarMapping(
    Object.prototype.hasOwnProperty.call(value, 'default_time_range')
      ? value.default_time_range
      : {},
    'contract.default_time_range',
  );
  const parsedRecords = records.map((record, index) =>
    parseRecord(record, index, releaseStage, defaultTimeRange),
  );
  assertUnique(
    parsedRecords.map(({ id }) => id),
    'record ids',
  );
  assertUnique(
    parsedRecords.map(({ dashboard, panel }) => `${dashboard}/${panel}`),
    'dashboard/panel mappings',
  );

  return {
    contractVersion: requiredString(value, 'contract_version', 'contract'),
    releaseStage,
    productVersions: parseProductVersions(value.product_versions),
    defaultTimeRange,
    jiraKey: OBSERVABILITY_JIRA_KEY,
    records: parsedRecords,
  };
};

export const parseObservabilityContractYaml = (source: string): ObservabilityContract => {
  let parsed: unknown;
  try {
    parsed = YAML.load(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Observability contract YAML is invalid: ${message}`);
  }
  return parseObservabilityContract(parsed);
};

export const getApplicableObservabilityRecords = (
  contract: ObservabilityContract,
): ObservabilityRecord[] =>
  contract.records.filter(({ releaseStage }) => releaseStage === contract.releaseStage);

export const getAuthorizationOutcome = (
  contract: ObservabilityContract,
  dashboardName?: string,
): AuthorizationResponse | undefined => {
  return getAuthorizationOutcomeFromRecords(
    getApplicableObservabilityRecords(contract).filter(
      ({ dashboard }) => dashboardName === undefined || dashboard === dashboardName,
    ),
  );
};

export const getAuthorizationOutcomeForRecords = (
  contract: ObservabilityContract,
  recordIds: string[],
): AuthorizationResponse | undefined =>
  getAuthorizationOutcomeFromRecords(
    getApplicableObservabilityRecords(contract).filter(({ id }) => recordIds.includes(id)),
  );

const getAuthorizationOutcomeFromRecords = (
  records: ObservabilityRecord[],
): AuthorizationResponse | undefined => {
  const outcomes = records
    .map(({ authorizationResponse }) => authorizationResponse)
    .filter((outcome) => outcome !== 'not-applicable');
  if (outcomes.length === 0) {
    return undefined;
  }
  if (outcomes.includes('review-required')) {
    return 'review-required';
  }
  const uniqueOutcomes = [...new Set(outcomes)];
  if (uniqueOutcomes.length > 1) {
    throw new Error(
      `Observability contract contains conflicting authorization responses: ${uniqueOutcomes.join(
        ', ',
      )}`,
    );
  }
  return uniqueOutcomes[0];
};

const parseLocalPersona = (value: unknown, index: number): ObservabilityPersonaFixture => {
  const path = `personas[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Dashboard observability fixture field '${path}' must be an object`);
  }
  rejectUnknownKeys(value, PERSONA_KEYS, path);
  const visibleDashboardNames = requiredStringArray(value, 'visibleDashboardNames', path);
  const hiddenDashboardNames = requiredStringArray(value, 'hiddenDashboardNames', path);
  assertUnique(visibleDashboardNames, `${path}.visibleDashboardNames`);
  assertUnique(hiddenDashboardNames, `${path}.hiddenDashboardNames`);
  if (visibleDashboardNames.some((name) => hiddenDashboardNames.includes(name))) {
    throw new Error(
      `Dashboard observability persona '${requiredString(
        value,
        'id',
        path,
      )}' cannot both show and hide a dashboard`,
    );
  }
  return {
    id: requiredString(value, 'id', path),
    credentialVariable: requiredString(value, 'credentialVariable', path),
    namespaceScope: requiredString(value, 'namespaceScope', path),
    ...(value.unauthorizedNamespaceScope !== undefined
      ? { unauthorizedNamespaceScope: requiredString(value, 'unauthorizedNamespaceScope', path) }
      : {}),
    visibleDashboardNames,
    hiddenDashboardNames,
  };
};

export const parseObservabilityFixtureConfig = (value: unknown): ObservabilityFixtureConfig => {
  if (!isRecord(value)) {
    throw new Error('Dashboard observability fixture configuration must be an object');
  }
  rejectUnknownKeys(value, FIXTURE_KEYS, 'fixtures');
  const { personas } = value;
  if (!Array.isArray(personas) || personas.length === 0) {
    throw new Error("Dashboard observability fixture field 'personas' must be a non-empty array");
  }
  const parsedPersonas = personas.map(parseLocalPersona);
  assertUnique(
    parsedPersonas.map(({ id }) => id),
    'dashboard observability persona ids',
  );
  assertUnique(
    parsedPersonas.map(({ credentialVariable }) => credentialVariable),
    'dashboard observability credential variables',
  );
  const foreignModelNames = requiredStringArray(value, 'foreignModelNames', 'fixtures');
  assertUnique(foreignModelNames, 'dashboard observability foreign model names');
  const seededModelName = requiredString(value, 'seededModelName', 'fixtures');
  if (foreignModelNames.includes(seededModelName)) {
    throw new Error('Dashboard observability seeded model must not be listed as foreign data');
  }
  return {
    seededModelName,
    foreignModelNames,
    personas: parsedPersonas,
  };
};

export const validateObservabilityFixtureConfig = (
  config: ObservabilityFixtureConfig,
  dashboards: LocalObservabilityDashboard[],
  contract: ObservabilityContract,
): void => {
  const dashboardNames = new Set(dashboards.map(({ contractName }) => contractName));
  const shippedDashboardNames = new Set(
    getApplicableObservabilityRecords(contract)
      .filter(({ capability }) => capability === 'shipped')
      .map(({ dashboard }) => dashboard),
  );
  config.personas.forEach((persona) => {
    if (persona.visibleDashboardNames.length === 0) {
      throw new Error(
        `Dashboard observability persona '${persona.id}' must validate at least one dashboard`,
      );
    }
    [...persona.visibleDashboardNames, ...persona.hiddenDashboardNames].forEach((name) => {
      if (!dashboardNames.has(name)) {
        throw new Error(
          `Dashboard observability persona '${persona.id}' references unknown dashboard '${name}'`,
        );
      }
    });
    if (
      !persona.visibleDashboardNames.some((dashboardName) =>
        shippedDashboardNames.has(dashboardName),
      )
    ) {
      throw new Error(
        `Dashboard observability persona '${persona.id}' must validate at least one shipped dashboard`,
      );
    }
    if (
      persona.unauthorizedNamespaceScope !== undefined &&
      persona.unauthorizedNamespaceScope === persona.namespaceScope
    ) {
      throw new Error(
        `Dashboard observability persona '${persona.id}' must use a different unauthorized namespace`,
      );
    }
    if (
      persona.unauthorizedNamespaceScope !== undefined &&
      !persona.visibleDashboardNames.includes('models')
    ) {
      throw new Error(
        `Dashboard observability persona '${persona.id}' cannot configure an unauthorized namespace without the models dashboard`,
      );
    }
  });
};

type EvidenceDirectoryOptions = { allowAbsolute?: boolean };

export const validateEvidenceDirectory = (
  directory: string,
  { allowAbsolute = false }: EvidenceDirectoryOptions = {},
): string => {
  const normalized = directory.replaceAll('\\', '/');
  const isAbsolute = normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized);
  if (
    normalized.includes('\0') ||
    (!allowAbsolute && isAbsolute) ||
    normalized.split('/').some((part) => part === '..')
  ) {
    throw new Error('Observability evidence directory must be a non-empty path without traversal');
  }
  const trimmed = normalized.replace(/\/+$/, '');
  if (trimmed.length === 0) {
    throw new Error('Observability evidence directory must be a non-empty path without traversal');
  }
  return trimmed;
};

// These IDs are reviewed semantic IDs in the shared release matrix. The values are
// dashboard-manifest panel keys, not a second copy of PromQL or capability expectations.
export const LOCAL_OBSERVABILITY_PANEL_IDS: Partial<Record<string, Record<string, string>>> = {
  cluster: {
    'cluster-system-health': 'systemHealth',
    'cluster-deployed-models': 'deployedModels',
    'cluster-gpu-utilization': 'gpuUtilizationStat',
    'cluster-gpu-utilization-by-project': 'gpuUtilizationByProject',
    'cluster-cpu': 'cpuUtilizationArea',
    'cluster-memory': 'memoryUtilizationArea',
    'cluster-network': 'networkUtilizationArea',
  },
  models: {
    'models-model-table': 'modelDeploymentsTable',
    'models-request-queue': 'requestQueueLength',
    'models-replicas': 'replicaCount',
    'models-latency': 'requestLatency',
  },
};

// These contract records are applicable to GA but intentionally absent from the dashboard
// manifests until their capability is promoted by the shared release contract.
export const LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS: Record<string, Record<string, string>> = {
  models: {
    'models-ttft': 'timeToFirstToken',
    'models-token-generation': 'requestSuccessRate',
    'models-throughput': 'tokenThroughput',
    'models-response-distribution': 'responseTimeDistribution',
  },
};

// These dashboard panels are shipped but do not yet have a corresponding producer
// release-contract record. Keep them explicit so they are still checked for a usable
// rendered state rather than silently omitted from the browser suite.
export const LOCAL_OBSERVABILITY_UNCONTRACTED_PANEL_IDS: Record<string, string[]> = {
  cluster: [
    'successRate',
    'gpuUtilizationArea',
    'cpuUtilizationByProject',
    'memoryUsageByProject',
    'clusterDetails',
  ],
};

export const LOCAL_OBSERVABILITY_STATIC_PANEL_IDS: Record<string, string[]> = {
  cluster: ['clusterDetails'],
};

// These records are exercised by the producer-side raw route suite. They are intentionally
// classified here so a new cluster/models record cannot be silently ignored by the UI suite.
export const LOCAL_OBSERVABILITY_SOURCE_RECORD_IDS: Record<string, string[]> = {
  cluster: ['namespace-proxy', 'tenancy-endpoint', 'data-science-thanos'],
  models: ['inference-vllm-series'],
};

// The regular Models dashboard uses the tenancy datasource. Keep its authorization contract
// separate from the cluster dashboard's other source routes and from the cluster-admin Models
// manifest, which is not used for a restricted persona.
export const LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS: Record<string, string[]> = {
  models: ['tenancy-endpoint'],
};

export const LOCAL_OBSERVABILITY_SELECTOR_RECORD = 'models-model-deployment-variable';

export const validateRequiredDashboardRecords = (contract: ObservabilityContract): void => {
  const localDashboardNames = new Set(Object.keys(LOCAL_OBSERVABILITY_PANEL_IDS));
  const expectedRecordIds = new Set([
    ...Object.values(LOCAL_OBSERVABILITY_PANEL_IDS).flatMap((records) =>
      Object.keys(records ?? {}),
    ),
    ...Object.values(LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS).flatMap((records) =>
      Object.keys(records),
    ),
    ...Object.values(LOCAL_OBSERVABILITY_SOURCE_RECORD_IDS).flat(),
    ...Object.values(LOCAL_OBSERVABILITY_AUTHORIZATION_RECORD_IDS).flat(),
    LOCAL_OBSERVABILITY_SELECTOR_RECORD,
  ]);
  const applicableLocalRecords = getApplicableObservabilityRecords(contract).filter(
    ({ dashboard }) => localDashboardNames.has(dashboard),
  );
  const applicableRecordIds = new Set(applicableLocalRecords.map(({ id }) => id));
  const missingRecordIds = [...expectedRecordIds].filter((id) => !applicableRecordIds.has(id));
  const unclassifiedRecordIds = [...applicableRecordIds].filter((id) => !expectedRecordIds.has(id));
  if (missingRecordIds.length > 0 || unclassifiedRecordIds.length > 0) {
    throw new Error(
      `Observability release contract dashboard records for '${contract.releaseStage}' are not classified: ` +
        `missing [${missingRecordIds.join(', ')}], unclassified [${unclassifiedRecordIds.join(
          ', ',
        )}]`,
    );
  }

  Object.entries(LOCAL_OBSERVABILITY_SOURCE_RECORD_IDS).forEach(([dashboardName, recordIds]) => {
    recordIds.forEach((recordId) => {
      const record = getApplicableObservabilityRecords(contract).find(({ id }) => id === recordId);
      if (record && record.dashboard !== dashboardName) {
        throw new Error(
          `Observability source record '${recordId}' belongs to '${record.dashboard}', not '${dashboardName}'`,
        );
      }
    });
  });
};

export const parseLocalObservabilityDashboards = (
  value: unknown,
): LocalObservabilityDashboard[] => {
  if (!Array.isArray(value)) {
    throw new Error('Dashboard observability manifest metadata must be an array');
  }
  const dashboards = value.map((item, index) => {
    const path = `dashboards[${index}]`;
    if (!isRecord(item)) {
      throw new Error(`Dashboard observability manifest field '${path}' must be an object`);
    }
    const panelIds = requiredStringArray(item, 'panelIds', path);
    const panelDisplayNamesValue = item.panelDisplayNames;
    if (!isRecord(panelDisplayNamesValue)) {
      throw new Error(
        `Dashboard observability manifest field '${path}.panelDisplayNames' must be an object`,
      );
    }
    const panelDisplayNames: Record<string, string> = {};
    Object.entries(panelDisplayNamesValue).forEach(([panelId, displayName]) => {
      if (typeof displayName !== 'string' || displayName.trim().length === 0) {
        throw new Error(
          `Dashboard observability manifest field '${path}.panelDisplayNames.${panelId}' must be a non-empty string`,
        );
      }
      panelDisplayNames[panelId] = displayName;
    });
    if (
      panelIds.some(
        (panelId) => !Object.prototype.hasOwnProperty.call(panelDisplayNames, panelId),
      ) ||
      Object.keys(panelDisplayNames).some((panelId) => !panelIds.includes(panelId))
    ) {
      throw new Error(
        `Dashboard observability manifest field '${path}.panelDisplayNames' must match panelIds`,
      );
    }
    const variablesValue = item.variables;
    if (!Array.isArray(variablesValue)) {
      throw new Error(
        `Dashboard observability manifest field '${path}.variables' must be an array`,
      );
    }
    const variables = variablesValue.map((variable, variableIndex) => {
      const variablePath = `${path}.variables[${variableIndex}]`;
      if (!isRecord(variable)) {
        throw new Error(
          `Dashboard observability manifest field '${variablePath}' must be an object`,
        );
      }
      return {
        name: requiredString(variable, 'name', variablePath),
        ...(variable.displayName !== undefined
          ? { displayName: requiredString(variable, 'displayName', variablePath) }
          : {}),
      };
    });
    assertUnique(panelIds, `${path}.panelIds`);
    assertUnique(
      variables.map(({ name }) => name),
      `${path}.variables`,
    );
    return {
      contractName: requiredString(item, 'contractName', path),
      displayName: requiredString(item, 'displayName', path),
      runtimeNames: requiredStringArray(item, 'runtimeNames', path),
      panelIds,
      panelDisplayNames,
      variables,
    };
  });
  assertUnique(
    dashboards.map(({ contractName }) => contractName),
    'local dashboard contract names',
  );
  assertUnique(
    dashboards.flatMap(({ runtimeNames }) => runtimeNames),
    'local dashboard runtime names',
  );
  return dashboards;
};

const isLiveObservabilityRun = (): boolean => {
  const value = Cypress.env('CY_OBSERVABILITY_LIVE');
  return value === true || value === 'true' || Boolean(Cypress.env('OBSERVABILITY_CONTRACT'));
};

export const loadObservabilityContract = (): ObservabilityContract | undefined => {
  const rawContract: unknown = Cypress.env('OBSERVABILITY_CONTRACT');
  if (rawContract === undefined || rawContract === null || rawContract === '') {
    if (isLiveObservabilityRun()) {
      throw new Error(
        'Observability release contract was not loaded. Run the central E2E contract preparation step before starting Cypress.',
      );
    }
    return undefined;
  }
  return parseObservabilityContract(rawContract);
};

export const loadObservabilityFixtureConfig = (): ObservabilityFixtureConfig | undefined => {
  const rawConfig: unknown =
    Cypress.env('CY_OBSERVABILITY_FIXTURES') ?? Cypress.env('OBSERVABILITY_FIXTURES');
  if (rawConfig === undefined || rawConfig === null || rawConfig === '') {
    if (isLiveObservabilityRun()) {
      throw new Error(
        'Dashboard-local observability fixture configuration is required. Configure OBSERVABILITY in the local QE test variables or provide CY_OBSERVABILITY_FIXTURES.',
      );
    }
    return undefined;
  }

  let parsed: unknown = rawConfig;
  if (typeof rawConfig === 'string') {
    try {
      parsed = JSON.parse(rawConfig);
    } catch {
      throw new Error('CY_OBSERVABILITY_FIXTURES must contain valid JSON');
    }
  }
  return parseObservabilityFixtureConfig(parsed);
};

export const resolveObservabilityCredentials = (
  credentialVariable: string,
  credentials: Record<string, unknown>,
): ObservabilityCredentials => {
  const rawCredentials: unknown = credentials[credentialVariable];
  if (!isRecord(rawCredentials)) {
    throw new Error(
      `Observability persona credential variable '${credentialVariable}' is not configured`,
    );
  }
  const username = rawCredentials.USERNAME;
  const password = rawCredentials.PASSWORD;
  const authType = rawCredentials.AUTH_TYPE;
  if (
    typeof username !== 'string' ||
    username.trim().length === 0 ||
    typeof password !== 'string' ||
    password.trim().length === 0 ||
    typeof authType !== 'string' ||
    authType.trim().length === 0
  ) {
    throw new Error(
      `Observability persona credential variable '${credentialVariable}' is incomplete`,
    );
  }
  return { USERNAME: username, PASSWORD: password, AUTH_TYPE: authType };
};

export const loadLocalObservabilityDashboards = (): LocalObservabilityDashboard[] | undefined => {
  const rawDashboards: unknown = Cypress.env('OBSERVABILITY_LOCAL_DASHBOARDS');
  if (rawDashboards === undefined || rawDashboards === null || rawDashboards === '') {
    if (isLiveObservabilityRun()) {
      throw new Error(
        'Checked-in observability dashboard manifest metadata was not loaded before the live suite started',
      );
    }
    return undefined;
  }
  return parseLocalObservabilityDashboards(rawDashboards);
};
