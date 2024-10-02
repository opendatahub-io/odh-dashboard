import { createOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createDataConnection } from '~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from '~/__tests__/cypress/cypress/utils/oc_commands/dspa';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import type { CommandLineResult, StorageClassConfig } from '~/__tests__/cypress/cypress/types';
import {
  createStorageClass,
  deleteStorageClass,
  getStorageClassConfig,
} from '~/__tests__/cypress/cypress/utils/oc_commands/storageClass';
import type { SCReplacements } from '~/__tests__/cypress/cypress/types';

/**
 * Provision (using oc) all necessary resources for the Storage Class testing feature
 *
 * @param scName Project Name
 */
export const provisionStorageClassFeature = (scName: string): string[] => {
  const createdStorageClasses: string[] = [];

  //Provision a disabled non-default sc
  const scNameDisabledNonDefault = scName + '-disabled-non-default';
  let SCReplacement: SCReplacements = {
    SC_NAME: scNameDisabledNonDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'false',
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameDisabledNonDefault);

  //Provision an enabled non-default sc
  const scNameEnabledNonDefault = scName + '-enabled-non-default';
  SCReplacement = {
    SC_NAME: scNameEnabledNonDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameEnabledNonDefault);

  //Provision an enabled non-default sc in order to set it as default
  const scNameEnabledToDefault = scName + '-enabled-to-default';
  SCReplacement = {
    SC_NAME: scNameEnabledToDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameEnabledToDefault);

  //Provision an enabled non-default sc in order to set it as default
  const scNameEnabledAndDefault = scName + '-enabled-and-default';
  SCReplacement = {
    SC_NAME: scNameEnabledAndDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameEnabledAndDefault);

  return createdStorageClasses;
};

export const tearDownStorageClassFeature = (createdSC: string[]): void => {
  createdSC.forEach((scName) => {
    cy.log(`Deleting storage class: os-sc-${scName}`);
    deleteStorageClass('os-sc-' + scName);
  });
};

/**
 * Parse Storage Class Configuration
 *
 * @param result Output from getStorageClassConfig
 * @returns StorageClassConfig object
 */
export const parseStorageClassConfig = (result: CommandLineResult): StorageClassConfig => {
  const rawConfig = JSON.parse(result.stdout);
  const config: StorageClassConfig = {
    isDefault: rawConfig.isDefault,
    isEnabled: rawConfig.isEnabled,
    displayName: rawConfig.displayName,
    description: rawConfig.description,
  };

  // If description is undefined, remove it from the final object
  if (config.description === undefined) {
    delete config.description;
  }

  return config;
};

/**
 * Verify Storage Class Configuration retrieving the info using OC
 *
 * @param scName - Storage Class to verify
 * @param expectedIsDefault expected isDefault
 * @param expectedIsEnabled expected isEnabled
 * @param expectedDisplayName (Optional) expected Display Name
 * @param expectedDescription (Optional) expected Description
 */
export const verifyStorageClassConfig = (
  scName: string,
  expectedIsDefault: boolean,
  expectedIsEnabled: boolean,
  expectedDisplayName?: string,
  expectedDescription?: string,
): Cypress.Chainable<CommandLineResult> => {
  return getStorageClassConfig(scName).then((result) => {
    const config = parseStorageClassConfig(result);

    // Check mandatory fields
    cy.wrap(config.isDefault).should('equal', expectedIsDefault);
    cy.wrap(config.isEnabled).should('equal', expectedIsEnabled);

    // Check optional fields if provided
    if (expectedDisplayName !== undefined) {
      cy.wrap(config.displayName).should('equal', expectedDisplayName);
    }

    if (expectedDescription !== undefined) {
      if (expectedDescription === '') {
        cy.wrap(config.description).should('be.undefined');
      } else {
        cy.wrap(config.description).should('equal', expectedDescription);
      }
    }
    cy.log('Storage Class Config:', JSON.stringify(config));
    return cy.wrap(result);
  });
};

// // Provision a Project
// createOpenShiftProject(projectName);

// // Create a pipeline compatible Data Connection
// const dataConnectionReplacements: DataConnectionReplacements = {
//   NAMESPACE: projectName,
//   AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
//   AWS_DEFAULT_REGION: Buffer.from(AWS_BUCKETS.BUCKET_2.REGION).toString('base64'),
//   AWS_S3_BUCKET: Buffer.from(AWS_BUCKETS.BUCKET_2.NAME).toString('base64'),
//   AWS_S3_ENDPOINT: Buffer.from(AWS_BUCKETS.BUCKET_2.ENDPOINT).toString('base64'),
//   AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
// };
// createDataConnection(dataConnectionReplacements);

// // Configure Pipeline server: Create DSPA Secret
// const dspaSecretReplacements: DspaSecretReplacements = {
//   DSPA_SECRET_NAME: dspaSecretName,
//   NAMESPACE: projectName,
//   AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
//   AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
// };
// createDSPASecret(dspaSecretReplacements);

// // Configure Pipeline server: Create DSPA
// const dspaReplacements: DspaReplacements = {
//   DSPA_SECRET_NAME: dspaSecretName,
//   NAMESPACE: projectName,
//   AWS_S3_BUCKET: AWS_BUCKETS.BUCKET_2.NAME,
// };
// createDSPA(dspaReplacements);
// };
