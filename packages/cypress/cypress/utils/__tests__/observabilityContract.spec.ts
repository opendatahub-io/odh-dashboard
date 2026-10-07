import fs from 'fs';
import path from 'path';
import {
  getApplicableObservabilityRecords,
  getAuthorizationOutcomeForRecords,
  LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS,
  parseObservabilityContract,
  parseObservabilityContractYaml,
  parseObservabilityFixtureConfig,
  validateEvidenceDirectory,
  validateObservabilityContractRef,
  validateRequiredDashboardRecords,
} from '../observabilityContract';

const fixturePath = path.resolve(
  __dirname,
  '../../fixtures/e2e/observability/release_contract.yaml',
);

describe('parseObservabilityContractYaml', () => {
  it('should parse the checked-in static release contract fixture', () => {
    const contract = parseObservabilityContractYaml(fs.readFileSync(fixturePath, 'utf8'));

    expect(contract).toEqual(
      expect.objectContaining({
        contractVersion: '1.0.0',
        releaseStage: 'GA',
        productVersions: expect.objectContaining({
          rhoai: '${RHOAI_VERSION}',
          dashboard: '${DASHBOARD_VERSION}',
        }),
      }),
    );
    expect(getApplicableObservabilityRecords(contract)).toHaveLength(30);
    expect(() => validateRequiredDashboardRecords(contract)).not.toThrow();
    expect(getAuthorizationOutcomeForRecords(contract, ['tenancy-endpoint'])).toBe('403');
    expect(getAuthorizationOutcomeForRecords(contract, ['data-science-thanos'])).toBe(
      'isolation-only',
    );
    expect(LOCAL_OBSERVABILITY_NOT_SHIPPED_PANEL_IDS.models).toEqual(
      expect.objectContaining({
        'models-ttft': 'timeToFirstToken',
        'models-response-distribution': 'responseTimeDistribution',
      }),
    );
  });

  it('should reject malformed YAML contract records', () => {
    expect(() =>
      parseObservabilityContract({
        contract_version: '1.0.0',
        release_stage: 'GA',
        product_versions: {},
        default_time_range: {},
        records: [
          {
            id: 'incomplete',
            expected_http_status: [200],
            expected_prometheus_status: 'success',
            expected_result_type: 'vector',
            minimum_series: 0,
            required_labels: [],
            empty_result_valid: true,
            empty_ui_state: 'No data',
            capability: 'shipped',
            authorization_response: 'not-applicable',
          },
        ],
      }),
    ).toThrow('records[0].dashboard');
  });

  it('should reject unsupported root fields rather than accepting a second Jira identity', () => {
    const contractWithInvalidJiraKey = fs
      .readFileSync(fixturePath, 'utf8')
      .replace('contract_version: 1.0.0', 'contract_version: 1.0.0\njira_key: RHOAIENG-00000');

    expect(() => parseObservabilityContractYaml(contractWithInvalidJiraKey)).toThrow('jira_key');
  });

  it('should require an immutable commit SHA for the fetched contract', () => {
    const ref = 'ea55890e4d9552111ba24e3331a50bf6de3f7f49';

    expect(validateObservabilityContractRef(ref)).toBe(ref);
    expect(() => validateObservabilityContractRef('main')).toThrow('immutable');
  });
});

describe('parseObservabilityFixtureConfig', () => {
  it('should parse dashboard-local fixture identities without runtime handoff fields', () => {
    expect(
      parseObservabilityFixtureConfig({
        seededModelName: 'model-a',
        foreignModelNames: ['model-b'],
        personas: [
          {
            id: 'namespace-admin',
            credentialVariable: 'LDAP_ADMIN_USER',
            namespaceScope: 'namespace-a',
            unauthorizedNamespaceScope: 'namespace-b',
            visibleDashboardNames: ['models'],
            hiddenDashboardNames: ['cluster'],
          },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        seededModelName: 'model-a',
        foreignModelNames: ['model-b'],
      }),
    );
  });

  it('should reject runtime evidence handoff fields', () => {
    expect(() =>
      parseObservabilityFixtureConfig({
        seededModelName: 'model-a',
        foreignModelNames: ['model-b'],
        evidenceDirectory: '/tmp/evidence',
        personas: [
          {
            id: 'namespace-admin',
            credentialVariable: 'LDAP_ADMIN_USER',
            namespaceScope: 'namespace-a',
            visibleDashboardNames: ['models'],
            hiddenDashboardNames: [],
          },
        ],
      }),
    ).toThrow('evidenceDirectory');
  });
});

describe('validateEvidenceDirectory', () => {
  it('should accept a relative evidence directory', () => {
    expect(validateEvidenceDirectory('results/observability')).toBe('results/observability');
  });
});
