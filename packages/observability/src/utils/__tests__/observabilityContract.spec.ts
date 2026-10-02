import { parseObservabilityContract, validateEvidenceDirectory } from '../observabilityContract';

const createContract = () => ({
  jiraKey: 'RHOAIENG-96476',
  release: {
    stage: 'candidate',
    dashboardVersion: 'dashboard-version',
    imageVersion: 'image-version',
  },
  fixture: {
    namespaceA: 'namespace-a',
    namespaceB: 'namespace-b',
    seededModelName: 'seeded-model',
    foreignModelNames: ['foreign-model'],
    sourceTelemetryReady: true,
    readinessSignal: 'telemetry-ready',
  },
  authorization: {
    unauthorizedNamespaceOutcome: 'empty',
    foreignDataMustNotRender: true,
  },
  dashboards: [
    {
      name: 'dashboard-models',
      displayName: 'Models',
      capability: 'shipped',
      panels: [
        {
          id: 'panel-requests',
          displayName: 'Requests',
          capability: 'shipped',
          expectedState: 'non-empty',
        },
      ],
      modelSelector: {
        variableName: 'model_name',
        displayName: 'Model',
        namespaceVariableName: 'namespace',
      },
    },
  ],
  personas: [
    {
      id: 'namespace-admin',
      credentialVariable: 'NAMESPACE_ADMIN_USER',
      namespaceScope: 'namespace-a',
      unauthorizedNamespaceScope: 'namespace-b',
      visibleDashboardNames: ['dashboard-models'],
      hiddenDashboardNames: [],
      loadShippedDashboards: true,
      modelDashboardName: 'dashboard-models',
    },
  ],
  evidence: {
    directory: 'results/observability',
    runId: 'run-1',
  },
});

const expectContractError = (value: unknown, message: string) => {
  expect(() => parseObservabilityContract(value)).toThrow(message);
};

describe('validateEvidenceDirectory', () => {
  it('should accept a relative evidence directory', () => {
    expect(validateEvidenceDirectory('results/observability')).toBe('results/observability');
  });

  it('should reject absolute and traversal paths', () => {
    expect(() => validateEvidenceDirectory('/tmp/evidence')).toThrow(
      'must be a relative path without traversal',
    );
    expect(() => validateEvidenceDirectory('../evidence')).toThrow(
      'must be a relative path without traversal',
    );
    expect(() => validateEvidenceDirectory('')).toThrow(
      'must be a relative path without traversal',
    );
    expect(() => validateEvidenceDirectory('C:')).toThrow(
      'must be a relative path without traversal',
    );
    expect(() => validateEvidenceDirectory('C:relative')).toThrow(
      'must be a relative path without traversal',
    );
  });
});

describe('parseObservabilityContract', () => {
  it('should reject malformed root and required fields', () => {
    expectContractError(null, 'must be a JSON object');
    expectContractError({}, 'contract.release');
    expectContractError(
      {
        ...createContract(),
        release: { ...createContract().release, stage: ' ' },
      },
      'contract.release.stage',
    );
    expectContractError(
      {
        ...createContract(),
        fixture: { ...createContract().fixture, sourceTelemetryReady: 'yes' },
      },
      'contract.fixture.sourceTelemetryReady',
    );
    expectContractError(
      {
        ...createContract(),
        fixture: { ...createContract().fixture, foreignModelNames: [''] },
      },
      'contract.fixture.foreignModelNames',
    );
  });

  it('should reject malformed dashboard and panel declarations', () => {
    const base = createContract();
    expectContractError(
      { ...base, dashboards: [{ ...base.dashboards[0], capability: 'unsupported' }] },
      'dashboards[0].capability',
    );
    expectContractError({ ...base, dashboards: [null] }, 'dashboards[0]');
    expectContractError(
      {
        ...base,
        dashboards: [{ ...base.dashboards[0], panels: null }],
      },
      'dashboards[0].panels',
    );
    expectContractError(
      {
        ...base,
        dashboards: [{ ...base.dashboards[0], panels: [] }],
      },
      'must declare at least one panel',
    );
    expectContractError(
      {
        ...base,
        dashboards: [
          {
            ...base.dashboards[0],
            panels: [{ ...base.dashboards[0].panels[0], expectedState: 'unsupported' }],
          },
        ],
      },
      'expectedState',
    );
    expectContractError(
      {
        ...base,
        dashboards: [
          {
            ...base.dashboards[0],
            panels: [{ ...base.dashboards[0].panels[0], expectedState: undefined }],
          },
        ],
      },
      'must declare expectedState',
    );
    expectContractError(
      {
        ...base,
        dashboards: [
          {
            ...base.dashboards[0],
            panels: [null],
          },
        ],
      },
      'dashboards[].panels[0]',
    );
    expectContractError(
      {
        ...base,
        dashboards: [{ ...base.dashboards[0], modelSelector: null }],
      },
      'modelSelector',
    );
  });

  it('should reject malformed persona and authorization declarations', () => {
    const base = createContract();
    expectContractError({ ...base, personas: [null] }, 'personas[0]');
    expectContractError({ ...base, dashboards: [] }, 'dashboards');
    expectContractError({ ...base, personas: [] }, 'personas');
    expectContractError(
      {
        ...base,
        authorization: { ...base.authorization, unauthorizedNamespaceOutcome: 'unsupported' },
      },
      'unauthorizedNamespaceOutcome',
    );
    expectContractError(
      {
        ...base,
        authorization: { ...base.authorization, foreignDataMustNotRender: false },
      },
      'foreignDataMustNotRender',
    );
  });

  it('should reject invalid fixture and persona relationships', () => {
    const base = createContract();
    expectContractError(
      {
        ...base,
        fixture: { ...base.fixture, namespaceB: base.fixture.namespaceA },
      },
      'namespaces must be different',
    );
    expectContractError(
      {
        ...base,
        fixture: { ...base.fixture, foreignModelNames: [] },
      },
      'at least one foreign model',
    );
    expectContractError(
      {
        ...base,
        personas: [
          {
            ...base.personas[0],
            hiddenDashboardNames: ['dashboard-models'],
          },
        ],
      },
      'cannot both show and hide',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], visibleDashboardNames: ['unknown-dashboard'] }],
      },
      'references unknown dashboard',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], visibleDashboardNames: [] }],
      },
      'must validate at least one shipped dashboard',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], modelDashboardName: 'unknown-dashboard' }],
      },
      'invalid model dashboard',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], namespaceScope: 'namespace-c' }],
      },
      'authorized namespace must match',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], unauthorizedNamespaceScope: 'namespace-a' }],
      },
      'must use a different unauthorized namespace',
    );
    expectContractError(
      {
        ...base,
        personas: [{ ...base.personas[0], unauthorizedNamespaceScope: 'namespace-c' }],
      },
      'unauthorized namespace must match',
    );
  });

  it('should parse a contract with explicit authorization coverage', () => {
    expect(parseObservabilityContract(createContract())).toEqual(
      expect.objectContaining({
        jiraKey: 'RHOAIENG-96476',
        evidence: { directory: 'results/observability', runId: 'run-1' },
      }),
    );
  });

  it('should reject a contract without an authorization scenario', () => {
    const contract = createContract();
    delete (contract.personas[0] as { unauthorizedNamespaceScope?: string })
      .unauthorizedNamespaceScope;

    expect(() => parseObservabilityContract(contract)).toThrow(
      'must include an unauthorized namespace scenario',
    );
  });

  it('should reject a persona that performs no dashboard validation', () => {
    const contract = createContract();
    contract.personas[0].loadShippedDashboards = false;
    delete (contract.personas[0] as { modelDashboardName?: string }).modelDashboardName;

    expect(() => parseObservabilityContract(contract)).toThrow(
      'must validate at least one shipped dashboard',
    );
  });

  it('should reject an unauthorized namespace scenario without a model dashboard', () => {
    const contract = createContract();
    delete (contract.personas[0] as { modelDashboardName?: string }).modelDashboardName;

    expect(() => parseObservabilityContract(contract)).toThrow(
      'must declare a model dashboard for unauthorized namespace validation',
    );
  });

  it('should reject duplicate dashboard display names', () => {
    const contract = createContract();
    contract.dashboards.push({
      ...contract.dashboards[0],
      name: 'dashboard-cluster',
    });

    expect(() => parseObservabilityContract(contract)).toThrow(
      'dashboard display names must be unique',
    );
  });
});
