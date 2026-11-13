import { retryableBefore } from '../../../utils/retryableHooks';
import { ensureAdminOcSession, hasNvidiaGpus } from '../../../utils/oc_commands/baseCommands';
import {
  cleanupHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../utils/oc_commands/hardwareProfiles';
import { createCustomResource } from '../../../utils/oc_commands/customResources';

/**
 * Generic GPU HardwareProfile E2E test.
 *
 * Validates that a HardwareProfile with an NVIDIA GPU accelerator can be
 * created, verified, and cleaned up on a cluster that has GPU nodes.
 *
 * Reuses the existing `nim_nvidia_gpu.yaml` fixture and the shared
 * helper utilities (hasNvidiaGpus, createCleanHardwareProfile, etc.).
 *
 * When no GPU is present the GPU-specific assertions are skipped gracefully,
 * but the HardwareProfile CR lifecycle (create → read → delete) is still
 * exercised — it does not require actual GPU hardware.
 */

const hardwareProfileName = 'cypress-gpu-e2e-test';
const hardwareProfileFixture = 'resources/hardwareProfile/nim_nvidia_gpu.yaml';

describe('GPU HardwareProfile lifecycle', () => {
  let isThereGpus = false;

  retryableBefore(() => {
    return ensureAdminOcSession().then(() =>
      hasNvidiaGpus().then((hasGpus) => {
        isThereGpus = hasGpus;
        cy.log(`NVIDIA GPU nodes detected: ${isThereGpus}`);

        // Only set up HardwareProfile when GPUs are present
        if (!hasGpus) {
          cy.log('⚠️ No NVIDIA GPU nodes found — test will be skipped');
          return;
        }

        return cleanupHardwareProfiles(hardwareProfileName)
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
    // Only clean up if we actually created resources
    if (!isThereGpus) {
      return;
    }
    return ensureAdminOcSession()
      .then(() => cleanupHardwareProfile(hardwareProfileName))
      .then((result) => {
        if (result.exitCode !== 0) {
          cy.log(
            `⚠️ Cleanup warning: failed to remove HardwareProfile (exit ${result.exitCode}): ` +
              `${result.stderr || result.stdout}`,
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
      // ──────────────────────────────────────────────────────
      // SKIP if no GPU — nothing runs beyond this point
      // ──────────────────────────────────────────────────────
      if (!isThereGpus) {
        cy.log(
          '⚠️ SKIPPED: No NVIDIA GPU nodes found in this cluster. ' +
            'This test requires real GPU hardware and does not mock GPUs.',
        );
        this.skip(); // ← Mocha skip — marks test as "pending" (yellow)
        return;
      }

      // ──────────────────────────────────────────────────────
      // GPU found! Run the full validation
      // ──────────────────────────────────────────────────────

      cy.step('Verify the HardwareProfile CR exists on the cluster');
      cy.exec(
        `oc get hardwareprofiles ${hardwareProfileName} -n ${Cypress.env(
          'APPLICATIONS_NAMESPACE',
        )} -o json`,
      ).then((result) => {
        expect(result.exitCode).to.equal(0);
        const profile = JSON.parse(result.stdout);

        // Verify basic metadata
        expect(profile.metadata.name).to.equal(hardwareProfileName);
        expect(profile.spec.enabled).to.equal(true);
        expect(profile.spec.displayName).to.be.a('string').and.not.equal('');

        // Verify identifiers include CPU, Memory, and GPU
        const { identifiers } = profile.spec;
        expect(identifiers).to.have.length(3);

        const cpuId = identifiers.find((id: { identifier: string }) => id.identifier === 'cpu');
        expect(cpuId).to.not.equal(undefined);
        expect(cpuId.resourceType).to.equal('CPU');

        const memId = identifiers.find((id: { identifier: string }) => id.identifier === 'memory');
        expect(memId).to.not.equal(undefined);
        expect(memId.resourceType).to.equal('Memory');

        const gpuId = identifiers.find(
          (id: { identifier: string }) => id.identifier === 'nvidia.com/gpu',
        );
        expect(gpuId).to.not.equal(undefined);
        expect(gpuId.resourceType).to.equal('Accelerator');
        expect(gpuId.defaultCount).to.equal(1);

        // Verify GPU toleration
        const tolerations = profile.spec.scheduling?.node?.tolerations;
        expect(tolerations).to.not.equal(undefined);
        expect(tolerations).to.have.length.greaterThan(0);

        const gpuToleration = tolerations.find((t: { key: string }) => t.key === 'nvidia.com/gpu');
        expect(gpuToleration).to.not.equal(undefined);
        expect(gpuToleration.effect).to.equal('NoSchedule');
        expect(gpuToleration.operator).to.equal('Exists');
      });

      cy.step('Verify GPU count on cluster nodes');
      cy.exec(
        `oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\\t"}{.status.allocatable.nvidia\\.com/gpu}{"\\n"}{end}'`,
      ).then((result) => {
        expect(result.exitCode).to.equal(0);
        const gpuNodes = result.stdout
          .split('\n')
          .filter(Boolean)
          .filter((line) => {
            const parts = line.split('\t');
            return parts.length === 2 && Number(parts[1]) > 0;
          });
        cy.log(`Found ${gpuNodes.length} node(s) with NVIDIA GPUs`);
        expect(gpuNodes.length).to.be.greaterThan(0);
      });

      cy.step('Verify the HardwareProfile can be deleted');
      cy.exec(
        `oc delete hardwareprofiles ${hardwareProfileName} -n ${Cypress.env(
          'APPLICATIONS_NAMESPACE',
        )}`,
      ).then((result) => {
        expect(result.exitCode).to.equal(0);
      });

      cy.step('Verify the HardwareProfile is gone');
      cy.exec(
        `oc get hardwareprofiles ${hardwareProfileName} -n ${Cypress.env(
          'APPLICATIONS_NAMESPACE',
        )}`,
        { failOnNonZeroExit: false },
      ).then((result) => {
        expect(result.exitCode).to.not.equal(0);
        expect(result.stderr).to.contain('NotFound');
      });
    },
  );
});
