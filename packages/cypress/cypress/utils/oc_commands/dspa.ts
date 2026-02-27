import { applyOpenShiftYaml } from './baseCommands';
import { replacePlaceholdersInYaml } from '../yaml_files';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { DspaSecretReplacements, DspaReplacements, CommandLineResult } from '../../types';

const DSPA_RESOURCE_NAME = 'dspa';

/**
 * Try to create a DSPA Secret based on the dspaSecretReplacements config
 * @param dspaSecretReplacements Dictionary with the config values
 *      Dict Structure:
 *              dspaSecretReplacements = {
 *                  DSPA_SECRET_NAME: <DSPA SECRET NAME>,
 *                  NAMESPACE: <PROJECT NAME>,
 *                  AWS_ACCESS_KEY_ID: <AWS ACCESS KEY ID>,
 *                  AWS_SECRET_ACCESS_KEY: <AWS SECRET>,
 *               }
 * @param yamlFilePath
 */
export const createDSPASecret = (
  dspaSecretReplacements: DspaSecretReplacements,
  yamlFilePath = 'resources/yaml/dspa_secret.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaSecretReplacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });

/**
 * Try to create a DSPA based on the dspaReplacements config
 * @param dspaReplacements Dictionary with the config values
 *      Dict Structure:
 *              dspaSecretReplacements = {
 *                  DSPA_SECRET_NAME: <DSPA SECRET NAME>,
 *                  NAMESPACE: <PROJECT NAME>,
 *                  AWS_S3_BUCKET: <AWS BUCKET NAME>
 *               }
 * @param yamlFilePath
 */
export const createDSPA = (
  dspaReplacements: DspaReplacements,
  yamlFilePath = 'resources/yaml/dspa.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaReplacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });

type DspaCondition = { type?: string; status?: string; reason?: string; message?: string };

/**
 * Logs whether the pipeline server (DSPA) is ready and, if not, why.
 * Uses oc get dspa -o json and parses status.conditions (Ready + any False conditions).
 * Does not fail the test if oc fails.
 */
export const logDspaStatus = (projectName: string): void => {
  cy.exec(`oc get dspa ${DSPA_RESOURCE_NAME} -n ${projectName} -o json`, {
    failOnNonZeroExit: false,
  }).then((result) => {
    if (result.code !== 0) {
      const stderr = result.stderr.trim();
      cy.log(
        `[DSPA] Pipeline server not ready: oc get failed (exit ${result.code}). ${maskSensitiveInfo(
          stderr,
        )}`,
      );
      return;
    }
    try {
      const dspa = JSON.parse(result.stdout || '{}') as {
        status?: { conditions?: DspaCondition[] };
      };
      const conditions = dspa.status?.conditions ?? [];
      const readyCondition = conditions.find((c) => c.type === 'Ready');
      if (readyCondition?.status === 'True') {
        cy.log('[DSPA] Pipeline server is ready.');
        return;
      }
      const notReadyReasons = conditions
        .filter((c) => c.status === 'False')
        .map((c) => {
          const part = [c.type, c.reason, c.message].filter(Boolean).join(': ');
          return part || 'Unknown';
        });
      const reason =
        notReadyReasons.length > 0
          ? notReadyReasons.join('; ')
          : readyCondition?.message || readyCondition?.reason || 'Waiting for Ready condition';
      cy.log(`[DSPA] Pipeline server not ready: ${maskSensitiveInfo(reason)}`);
    } catch {
      cy.log('[DSPA] Pipeline server not ready: failed to parse DSPA status.');
    }
  });
};
