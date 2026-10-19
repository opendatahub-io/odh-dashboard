import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import { replacePlaceholdersInYaml } from '../yaml_files';
import type { LibraryTemplate } from '../runtimeLibrary';

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

export const getTemplatesByServingRuntimeName = (
  servingRuntimeName: string,
): Cypress.Chainable<LibraryTemplate[]> =>
  cy.exec(`oc get templates -o json -n ${applicationNamespace}`).then(({ stdout }) => {
    const list: TemplateList = JSON.parse(stdout);
    if (!Array.isArray(list.items)) {
      throw new Error('The Template list must contain an items array');
    }
    return list.items.filter((template) =>
      template.objects?.some(
        (resource) =>
          resource.kind === 'ServingRuntime' && resource.metadata?.name === servingRuntimeName,
      ),
    ) as LibraryTemplate[];
  });

export const checkServingRuntimeAbsent = (
  servingRuntimeName: string,
): Cypress.Chainable<Cypress.Exec> =>
  cy
    .exec(
      `oc get servingruntime ${servingRuntimeName} -n ${applicationNamespace} --ignore-not-found -o name`,
    )
    .should(({ stdout }) => {
      expect(stdout.trim(), 'Dry-run must not persist a standalone ServingRuntime').to.equal('');
    });

type TemplateList = {
  items?: {
    metadata?: { name?: string };
    objects?: { kind?: string; metadata?: { name?: string } }[];
  }[];
};

/**
 * Cleans up OpenShift templates by searching for a template whose nested ServingRuntime object
 * has the provided resource name.
 * If a matching template is found, it deletes the template; otherwise, it logs a message
 * and continues with the test execution.
 *
 * Lookup and delete failures are always logged. They only fail the test when `failOnError` is
 * true (use it in setup so stale templates cannot silently survive); leave it false in teardown
 * so cleanup problems do not replace the test's own result.
 *
 * @param servingRuntimeName - The nested ServingRuntime metadata.name to search for in Template.objects.
 * @param options.failOnError - Throw if the template lookup or any template deletion fails (default: false).
 * @returns A Cypress.Chainable that resolves to the result of the delete command or
 *          the original command execution result if no matching template is found.
 */
export const cleanupTemplates = (
  servingRuntimeName: string,
  { failOnError = false }: { failOnError?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const reportError = (message: string): void => {
    cy.log(`ERROR: ${message}`);
    if (failOnError) {
      throw new Error(message);
    }
  };

  const ocCommand = `oc get templates -ojson -n ${applicationNamespace}`;
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.exitCode !== 0) {
      reportError(
        `Failed to list templates while cleaning up ServingRuntime "${servingRuntimeName}": ${maskSensitiveInfo(
          result.stderr,
        )}`,
      );
      return cy.wrap(result);
    }

    let templateNames: string[] = [];
    try {
      const { items = [] } = JSON.parse(result.stdout) as TemplateList;
      templateNames = items
        .filter((item) =>
          item.objects?.some(
            (obj) =>
              obj.kind === 'ServingRuntime' && (obj.metadata?.name ?? '') === servingRuntimeName,
          ),
        )
        .map((item) => item.metadata?.name)
        .filter((name): name is string => !!name);
    } catch (e) {
      reportError(
        `Failed to parse template list while cleaning up ServingRuntime "${servingRuntimeName}"`,
      );
      return cy.wrap(result);
    }

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
        return cy.exec(deleteCommand, { failOnNonZeroExit: false }).then((deleteResult) => {
          if (deleteResult.exitCode !== 0) {
            reportError(
              `Failed to delete template "${templateNames[idx]}": ${maskSensitiveInfo(
                deleteResult.stderr,
              )}`,
            );
          }
          return deleteTemplates(idx + 1);
        });
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
