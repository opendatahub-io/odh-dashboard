import type { SCReplacements, CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';
import { MetadataAnnotation } from '#~/k8sTypes';
import { applyOpenShiftYaml, patchOpenShiftResource } from './baseCommands';

/**
 * Create an Storage Class based on the storageClassReplacements config
 * @param storageClassReplacements Dictionary with the config values
 *      Dict Structure:
 *              storageClassReplacements = {
 *                  SC_NAME: <STORAGE CLASS NAME>,
 *                  SC_IS_DEFAULT: <STR CAST BOOL>,
 *                  SC_IS_ENABLED: <STR CAST BOOL>
 *               }
 * @param yamlFilePath
 */
export const createStorageClass = (
  storageClassReplacements: SCReplacements,
  yamlFilePath = 'resources/yaml/storage_class.yaml',
): Cypress.Chainable<CommandLineResult> => {
  return cy.fixture(yamlFilePath).then((yamlContent) => {
    cy.log(yamlContent);
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, storageClassReplacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });
};

/**
 * Delete an Storage Class given its name
 *
 * @param scName Storage Class name
 * @returns Result Object of the operation
 */
export const deleteStorageClass = (scName: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc delete storageclass ${scName}`;
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR deleting ${scName} Storage Class
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Get Storage Class Configuration
 *
 * @param scName Storage Class name
 * @returns Result Object of the operation
 */
export const getStorageClassConfig = (scName: string): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get storageclass ${scName} -o jsonpath='{.metadata.annotations.opendatahub\\.io/sc-config}'`;
  cy.log(ocCommand);
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR Getting ${scName} Storage Class Config
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Get OpenShift default Storage Class
 *
 * @returns Result Object of the operation
 */
export const getOpenshiftDefaultStorageClass = (): Cypress.Chainable<CommandLineResult> => {
  const ocCommand = `oc get storageclass -o jsonpath='{.items[?(@.metadata.annotations.storageclass\\.kubernetes\\.io/is-default-class=="true")].metadata.name}'`;
  cy.log(ocCommand);
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR Getting OpenShift Default Storage Class
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
      throw new Error(`Command failed with code ${result.code}`);
    }
    return result;
  });
};

/**
 * Get all Storage Class names
 * @returns List of Storage Class names
 */
export const getStorageClassNames = (): Cypress.Chainable<string[]> => {
  const command = "oc get storageclass -o jsonpath='{.items[*].metadata.name}'";
  cy.log(`Executing command: ${command}`);
  return cy
    .exec(command, {
      failOnNonZeroExit: false,
    })
    .then((result: CommandLineResult) => {
      if (result.code !== 0) {
        cy.log(`ERROR Getting Storage Class Names
                stdout: ${result.stdout}
                stderr: ${result.stderr}`);
        throw new Error(`Command failed with code ${result.code}`);
      }
      return result.stdout.split(' ');
    });
};

/**
 * Get the display name of the default and enabled Storage Class
 * @returns The display name of the default and enabled storage class,
 *          or an error message if none is found
 */
export const getDefaultEnabledStorageClass = (): Cypress.Chainable<string> => {
  return getStorageClassNames().then((scNames: string[]) => {
    const checkStorageClass = (index: number): Cypress.Chainable<string> => {
      if (index >= scNames.length) {
        return cy.wrap('No storage class found that is both default and enabled');
      }

      const command = `oc get storageclass ${scNames[index]} -o jsonpath='{.metadata.annotations.opendatahub\\.io/sc-config}'`;
      cy.log(`Executing command: ${command}`);
      return cy
        .exec(command, { failOnNonZeroExit: false })
        .then((result: Cypress.Exec) => {
          if (result.code !== 0) {
            cy.log(`ERROR Getting ${scNames[index]} Storage Class Config
                    stdout: ${result.stdout}
                    stderr: ${result.stderr}`);
            throw new Error(`Command failed with code ${result.code}`);
          }
          return result.stdout;
        })
        .then((config: string) => {
          return cy.then(() => {
            try {
              const parsedConfig = JSON.parse(config);
              if (parsedConfig.isDefault && parsedConfig.isEnabled) {
                return parsedConfig.displayName;
              }
              return checkStorageClass(index + 1);
            } catch (error) {
              cy.log(
                `Error parsing config for ${scNames[index]}: ${
                  error instanceof Error ? error.toString() : 'unknown error'
                }`,
              );
              return checkStorageClass(index + 1);
            }
          });
        });
    };

    return checkStorageClass(0);
  });
};

/**
 * Patch an Storage Class based on the storageClassReplacements config
 * @param storageClassReplacements Dictionary with the config values
 *      Dict Structure:
 *              storageClassReplacements = {
 *                  SC_NAME: <STORAGE CLASS NAME>,
 *                  SC_IS_DEFAULT: <STR CAST BOOL>,
 *                  SC_IS_ENABLED: <STR CAST BOOL>
 *               }
 * @param yamlFilePath
 */
export const updateStorageClass = (
  storageClassReplacements: SCReplacements,
): Cypress.Chainable<CommandLineResult> => {
  const resourceName = storageClassReplacements.SC_NAME;

  const patchContent = JSON.stringify({
    metadata: {
      annotations: {
        [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
          isDefault: storageClassReplacements.SC_IS_DEFAULT === 'true',
          isEnabled: storageClassReplacements.SC_IS_ENABLED === 'true',
          displayName: storageClassReplacements.SC_NAME,
          lastModified: new Date().toISOString(),
        }),
      },
    },
  });

  return patchOpenShiftResource('storageclass', resourceName, patchContent);
};

/**
 * Disables all storage classes except for the default one
 * @returns A Cypress.Chainable that resolves when all updates are complete
 */
export const disableNonDefaultStorageClasses = (): Cypress.Chainable<void> => {
  let defaultSCName: string;

  return cy
    .wrap(null)
    .then(() => getDefaultEnabledStorageClass())
    .then((name: string) => {
      defaultSCName = name;
      return getStorageClassNames();
    })
    .then((scNames: string[]) => {
      const updatePromises = scNames.map((scName) => {
        if (scName !== defaultSCName) {
          const scReplacements: SCReplacements = {
            SC_NAME: scName,
            SC_IS_DEFAULT: 'false',
            SC_IS_ENABLED: 'false',
          };
          return () => updateStorageClass(scReplacements);
        }
        return () => cy.wrap(null);
      });

      return updatePromises.reduce((chain, updateFn) => {
        return chain.then(updateFn);
      }, cy.wrap(null));
    })
    .then(() => {
      // This empty then() ensures the chain resolves to void
      return undefined;
    }) as unknown as Cypress.Chainable<void>;
};
