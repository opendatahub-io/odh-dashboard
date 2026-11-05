import { retryableBefore } from '../../../utils/retryableHooks';
import {
  ensureAdminOcSession,
  getNodeWithMostAllocatableGpus,
  hasNvidiaGpus,
} from '../../../utils/oc_commands/baseCommands';
import {
  cleanupHardwareProfile,
  getHardwareProfile,
} from '../../../utils/oc_commands/hardwareProfiles';
import { createCustomResource } from '../../../utils/oc_commands/customResources';

/**
 * Generic GPU HardwareProfile E2E test.
 *
 * Validates that a HardwareProfile with an NVIDIA GPU accelerator can be
 * created, verified, and cleaned up on a cluster that has GPU nodes.
 *
 * Both the setup hook and the test body are skipped when the cluster has no
 * NVIDIA GPU node, so this spec is only meaningful in a lane with GPU hardware.
 *
 * `createCustomResource` is used instead of the existing clean-creation helper
 * because only it allows overriding `metadata.name` on the fixture.
 */

const hardwareProfileName = 'cypress-gpu-e2e-test';
const hardwareProfileFixture = 'resources/hardwareProfile/nim_nvidia_gpu.yaml';

describe('GPU HardwareProfile lifecycle', () => {
  let isThereGpus = false;
  let profileGpuMaxCount = 0;
  let createdProfile = false;

  retryableBefore(() => {
    return ensureAdminOcSession().then(() =>
      hasNvidiaGpus().then((hasGpus) => {
        isThereGpus = hasGpus;
        cy.log(`NVIDIA GPU nodes detected: ${isThereGpus}`);

        // Only set up HardwareProfile when GPUs are present
        if (!hasGpus) {
          cy.task(
            'log',
            '⚠️ SKIPPED: No NVIDIA GPU nodes found in this cluster. ' +
              'This test requires real GPU hardware and does not mock GPUs.',
          );
          return;
        }

        return cleanupHardwareProfile(hardwareProfileName)
          .then((cleanupResult) => {
            if (cleanupResult.exitCode !== 0) {
              throw new Error(
                `Failed to clean up stale HardwareProfile before creation: ${
                  cleanupResult.stderr || cleanupResult.stdout
                }`,
              );
            }
          })
          .then(() =>
            createCustomResource(
              Cypress.env('APPLICATIONS_NAMESPACE'),
              hardwareProfileFixture,
              hardwareProfileName,
            ),
          )
          .then((result) => {
            // The create was attempted in this run, not necessarily confirmed: `oc apply`
            // can create the resource and still fail on the return value.
            createdProfile = true;
            if (result.exitCode !== 0) {
              throw new Error(
                `Failed to create GPU HardwareProfile: ${result.stderr || result.stdout}`,
              );
            }
          });
      }),
    );
  });

  after(() => {
    // Only clean up if this run attempted to create the profile
    if (!createdProfile) {
      return;
    }
    return ensureAdminOcSession()
      .then(() => cleanupHardwareProfile(hardwareProfileName))
      .then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to clean up HardwareProfile ${hardwareProfileName} after test ` +
              `(exit ${result.exitCode}): ${result.stderr || result.stdout}`,
          );
        }
      });
  });

  it(
    'should create and verify a GPU-enabled HardwareProfile CR',
    {
      tags: ['@Sanity', '@Dashboard', '@GPU', '@HardwareProfiles'],
    },
    function testIsThereGpus() {
      // this.skip() must be the first command in the body (see utils/skipUtils.ts)
      if (!isThereGpus) {
        this.skip();
      }

      // ──────────────────────────────────────────────────────
      // GPU found! Run the full validation
      // ──────────────────────────────────────────────────────

      cy.step('Verify the HardwareProfile CR exists on the cluster');
      getHardwareProfile(hardwareProfileName).then((result) => {
        const profile = JSON.parse(result.stdout);

        // Verify basic metadata
        expect(profile.metadata.name).to.equal(hardwareProfileName);
        expect(profile.spec.enabled).to.equal(true);
        // createCustomResource only overrides metadata.name, so displayName comes from the fixture
        expect(profile.spec.displayName).to.equal('cypress-nim-nvidia-gpu');

        // Verify identifiers include CPU, Memory, and GPU
        const { identifiers } = profile.spec;
        expect(identifiers).to.have.length(3);

        const cpuId = identifiers.find((id: { identifier: string }) => id.identifier === 'cpu');
        expect(cpuId).to.not.equal(undefined);
        expect(cpuId.resourceType).to.equal('CPU');
        expect(cpuId.defaultCount).to.equal(2);
        expect(cpuId.minCount).to.equal(1);
        expect(cpuId.maxCount).to.equal(4);

        const memId = identifiers.find((id: { identifier: string }) => id.identifier === 'memory');
        expect(memId).to.not.equal(undefined);
        expect(memId.resourceType).to.equal('Memory');
        expect(memId.defaultCount).to.equal('8Gi');
        expect(memId.minCount).to.equal('4Gi');
        expect(memId.maxCount).to.equal('16Gi');

        const gpuId = identifiers.find(
          (id: { identifier: string }) => id.identifier === 'nvidia.com/gpu',
        );
        expect(gpuId).to.not.equal(undefined);
        expect(gpuId.resourceType).to.equal('Accelerator');
        expect(gpuId.defaultCount).to.equal(1);
        profileGpuMaxCount = gpuId.maxCount;

        // Verify GPU toleration
        const tolerations = profile.spec.scheduling?.node?.tolerations;
        expect(tolerations).to.not.equal(undefined);
        expect(tolerations).to.have.length.greaterThan(0);

        const gpuToleration = tolerations.find((t: { key: string }) => t.key === 'nvidia.com/gpu');
        expect(gpuToleration).to.not.equal(undefined);
        expect(gpuToleration.effect).to.equal('NoSchedule');
        expect(gpuToleration.operator).to.equal('Exists');
      });

      cy.step('Cross-check the profile GPU maxCount against cluster allocatable NVIDIA GPUs');
      getNodeWithMostAllocatableGpus().then((best) => {
        cy.log(`profile maxCount: ${profileGpuMaxCount}`);
        expect(best.gpuCount).to.be.at.least(profileGpuMaxCount);
      });

      cy.step('Verify the HardwareProfile can be deleted');
      cleanupHardwareProfile(hardwareProfileName).then((result) => {
        expect(result.exitCode).to.equal(0);
      });

      cy.step('Verify the HardwareProfile is gone');
      getHardwareProfile(hardwareProfileName, { allowNotFound: true }).then((result) => {
        expect(result.exitCode).to.not.equal(0);
        expect(result.stderr).to.contain('NotFound');
      });
    },
  );
});
