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
