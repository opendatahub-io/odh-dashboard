import type { SCReplacements, CommandLineResult } from '~/__tests__/cypress/cypress/types';
import { replacePlaceholdersInYaml } from '~/__tests__/cypress/cypress/utils/yaml_files';
import { applyOpenShiftYaml } from './baseCommands';

/**
 * Try to create an Storage Class based on the storageClassReplacements config
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
  const ocCommand = `oc get storageclass os-sc-${scName} -o jsonpath='{.metadata.annotations.opendatahub\\.io/sc-config}'`;
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
  const ocCommand = `oc get storageclass -o jsonpath='{.items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")].metadata.name}'`;
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
  return cy
    .exec("oc get storageclass -o jsonpath='{.items[*].metadata.name}'", {
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

      return cy
        .exec(
          `oc get storageclass ${scNames[index]} -o jsonpath='{.metadata.annotations.opendatahub\\.io/sc-config}'`,
          { failOnNonZeroExit: false },
        )
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
              } else {
                return checkStorageClass(index + 1);
              }
            } catch (error) {
              cy.log(`Error parsing config for ${scNames[index]}: ${error}`);
              return checkStorageClass(index + 1);
            }
          });
        });
    };

    return checkStorageClass(0);
  });
};

// /**
//  * Get and delete Storage Classes that match a given prefix
//  *
//  * @param prefix The prefix to match Storage Class names against
//  * @returns Promise<void>
//  */
// export const deleteStorageClassesByPrefix = (prefix: string): Cypress.Chainable<void> => {
//   const getCommand = `oc get storageclass -o jsonpath='{.items[?(@.metadata.name=~"^${prefix}.*")].metadata.name}'`;

//   return cy.exec(getCommand, { failOnNonZeroExit: false }).then((result) => {
//     if (result.code !== 0) {
//       cy.log(`ERROR getting Storage Classes with prefix ${prefix}
//               stdout: ${result.stdout}
//               stderr: ${result.stderr}`);
//       throw new Error(`Command failed with code ${result.code}`);
//     }

//     const storageClasses = result.stdout.split(' ').filter(Boolean);

//     if (storageClasses.length === 0) {
//       cy.log(`No Storage Classes found with prefix ${prefix}`);
//       return;
//     }

//     // Use cy.wrap() to create a Cypress chain
//     return cy.wrap(storageClasses).each((scName) => {
//       cy.log(`Deleting Storage Class: ${scName}`);
//       return deleteStorageClass(scName);
//     });
//   });
// };

// // oc get storageclass | grep '^os-sc-test-settings-storage-classes' | awk '{print $1}' | xargs oc delete storageclass
