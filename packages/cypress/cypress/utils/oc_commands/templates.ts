import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { replacePlaceholdersInYaml } from '../yaml_files';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

export type WaitForTemplateOptions = {
  maxAttempts?: number;
  pollIntervalMs?: number;
};

/**
 * Waits until a template exists in the cluster whose nested ServingRuntime object has
 * `metadata.name` exactly matching the provided ServingRuntime name.
 *
 * This is useful for verifying that the backend successfully created the Template after submitting
 * the Serving Runtime form.
 */
export const waitForTemplateByServingRuntimeName = (
  servingRuntimeName: string,
  { maxAttempts = 30, pollIntervalMs = 2000 }: WaitForTemplateOptions = {},
): Cypress.Chainable<Cypress.Exec> => {
  const cmd = `oc get templates -ojson -n ${applicationNamespace} | jq -e --arg name "${servingRuntimeName}" '.items[] | select(.objects[]? | select(.kind == "ServingRuntime") | (.metadata?.name? // "") == $name) | .metadata.name' >/dev/null`;
  return pollUntilSuccess(cmd, `template containing ServingRuntime name "${servingRuntimeName}"`, {
    maxAttempts,
    pollIntervalMs,
  });
};

/**
 * Cleans up OpenShift templates by searching for a template whose nested ServingRuntime object
 * has the provided resource name.
 * If a matching template is found, it deletes the template; otherwise, it logs a message
 * and continues with the test execution.
 *
 * @param servingRuntimeName - The nested ServingRuntime metadata.name to search for in Template.objects.
 * @returns A Cypress.Chainable that resolves to the result of the delete command or
 *          the original command execution result if no matching template is found.
 */
export const cleanupTemplates = (
  servingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  const ocCommand =
    `oc get templates -ojson -n ${applicationNamespace}` +
    ` | jq -r --arg name "${servingRuntimeName}" ` +
    `'.items[] | select(.objects[]? | select(.kind == "ServingRuntime") | (.metadata?.name? // "") == $name) | .metadata.name'`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    const templateNames = result.stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (templateNames.length > 0) {
      if (templateNames.length === 1) {
        cy.log(`Template found: ${templateNames[0]}. Proceeding to delete.`);
      } else {
        cy.log(
          `Multiple templates found for ServingRuntime "${servingRuntimeName}": ${templateNames.join(
            ', ',
          )}. Proceeding to delete all exact matches.`,
        );
      }

      const deleteTemplates = (idx = 0): Cypress.Chainable<CommandLineResult> => {
        if (idx >= templateNames.length) {
          return cy.wrap(result);
        }

        const deleteCommand = `oc delete template ${templateNames[idx]} -n ${applicationNamespace}`;
        return cy
          .exec(deleteCommand, { failOnNonZeroExit: false })
          .then(() => deleteTemplates(idx + 1));
      };

      return deleteTemplates();
    }
    cy.log('No matching template found, proceeding with the test.');
    return cy.wrap(result);
  });
};

/**
 * Reads a YAML file and replaces {{PLACEHOLDER}} keys with provided values.
 * Intended for generating unique ServingRuntime YAML content per-test before uploading via UI.
 *
 * @param yamlPath Absolute path to the YAML file to read.
 * @param replacements Placeholder map, e.g. { SERVING_RUNTIME_NAME: 'foo', SERVING_RUNTIME_DISPLAY_NAME: 'Foo' }.
 */
export const renderYamlFileWithReplacements = (
  yamlPath: string,
  replacements: Record<string, string>,
): Cypress.Chainable<string> =>
  cy
    .readFile(yamlPath, 'utf8')
    .then((yamlContent) => replacePlaceholdersInYaml(yamlContent, replacements));
