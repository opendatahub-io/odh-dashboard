import {
  assertEvalHubProvisionTargetAvailable,
  EVALHUB_E2E_MANAGED_LABEL,
  resolveEvalHubInstance,
  type EvalHubResource,
} from '../../../utils/oc_commands/evalHubInstance';
import { getEvalHubTenantResourceNames } from '../../../utils/oc_commands/evalHubModelDeploy';

const evalHubResource = (
  name: string,
  namespace: string,
  options: { tenancy?: 'multi' | 'single'; managedByE2e?: boolean } = {},
): EvalHubResource => ({
  metadata: {
    name,
    namespace,
    labels: options.managedByE2e ? { [EVALHUB_E2E_MANAGED_LABEL]: 'true' } : undefined,
  },
  spec: options.tenancy ? { tenancy: options.tenancy } : undefined,
});

describe('EvalHub instance discovery', () => {
  it('treats the default tenancy as multi-tenant', () => {
    expect(resolveEvalHubInstance([evalHubResource('evalhub', 'evalhub')])).to.deep.equal({
      name: 'evalhub',
      namespace: 'evalhub',
      managedByE2e: false,
    });
  });

  it('ignores single-tenant instances', () => {
    expect(
      resolveEvalHubInstance([
        evalHubResource('evalhub-single', 'team-a', { tenancy: 'single' }),
        evalHubResource('evalhub-shared', 'platform', { tenancy: 'multi' }),
      ]),
    ).to.deep.equal({
      name: 'evalhub-shared',
      namespace: 'platform',
      managedByE2e: false,
    });
  });

  it('mirrors the BFF selection for differently named multi-tenant instances', () => {
    expect(
      resolveEvalHubInstance([
        evalHubResource('evalhub-zeta', 'platform-b'),
        evalHubResource('evalhub-alpha', 'platform-a'),
      ]),
    ).to.deep.equal({
      name: 'evalhub-alpha',
      namespace: 'platform-a',
      managedByE2e: false,
    });
  });

  it('rejects the non-prefixed service that the BFF would reject', () => {
    expect(() =>
      resolveEvalHubInstance([
        evalHubResource('alpha', 'platform-a'),
        evalHubResource('evalhub', 'evalhub'),
      ]),
    ).to.throw(
      "Dashboard discovery would select platform-a/alpha, but the EvalHub BFF only accepts service names beginning with 'evalhub'.",
    );
  });

  it('rejects duplicate multi-tenant names across namespaces', () => {
    expect(() =>
      resolveEvalHubInstance([
        evalHubResource('evalhub', 'evalhub'),
        evalHubResource('evalhub', 'redhat-ods-applications', { managedByE2e: true }),
      ]),
    ).to.throw(
      'Found duplicate multi-tenant EvalHub names across namespaces: ' +
        'evalhub/evalhub, redhat-ods-applications/evalhub (E2E-provisioned)',
    );
  });

  it('requires the configured preinstalled instance', () => {
    expect(() =>
      resolveEvalHubInstance([evalHubResource('evalhub', 'other')], {
        name: 'evalhub',
        namespace: 'evalhub',
      }),
    ).to.throw('Required preinstalled EvalHub evalhub/evalhub was not found.');
  });

  it('rejects a required instance when the BFF would select another key', () => {
    expect(() =>
      resolveEvalHubInstance(
        [evalHubResource('evalhub-alpha', 'platform'), evalHubResource('evalhub', 'evalhub')],
        { name: 'evalhub', namespace: 'evalhub' },
      ),
    ).to.throw(
      'Dashboard discovery would select platform/evalhub-alpha, not the required evalhub/evalhub.',
    );
  });

  it('refuses to provision over an existing single-tenant target', () => {
    expect(() =>
      assertEvalHubProvisionTargetAvailable(
        [evalHubResource('evalhub', 'redhat-ods-applications', { tenancy: 'single' })],
        { name: 'evalhub', namespace: 'redhat-ods-applications' },
      ),
    ).to.throw(
      'Refusing to provision EvalHub redhat-ods-applications/evalhub because that resource already exists',
    );
  });

  it('allows provisioning when the same single-tenant name exists in another namespace', () => {
    expect(() =>
      assertEvalHubProvisionTargetAvailable(
        [evalHubResource('evalhub', 'team-a', { tenancy: 'single' })],
        { name: 'evalhub', namespace: 'redhat-ods-applications' },
      ),
    ).not.to.throw();
  });

  it('derives tenant resource names from the selected EvalHub instance', () => {
    expect(
      getEvalHubTenantResourceNames({
        serviceName: 'evalhub-qa',
        serviceNamespace: 'platform',
      }),
    ).to.deep.equal({
      jobServiceAccountName: 'evalhub-qa-platform-job',
      jobAccessRoleName: 'evalhub-qa-platform-job-access-role',
      serviceCAConfigMapName: 'evalhub-qa-service-ca',
    });
  });
});
