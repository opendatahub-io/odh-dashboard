import { StorageProvisioner } from '@odh-dashboard/internal/pages/storageClasses/storageEnums';
import type {
  CommandLineResult,
  StorageClassConfig,
  SCReplacements,
  SCAccessMode,
} from '#~/__tests__/cypress/cypress/types';
import {
  createStorageClass,
  deleteStorageClass,
  getStorageClassConfig,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/storageClass';
import {
  deleteOpenShiftProject,
  addUserToProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from './projectChecker';

/**
 * Provision (using oc) all necessary resources for the Storage Class testing feature
 * (Settings -> Storage Classes)
 *
 * @param scName Project Name
 * @param scAccessMode (Optional) Access Mode object in format of {"ReadWriteOnce":false}
 */
export const provisionStorageClassFeature = (
  scName: string,
  scAccessMode: SCAccessMode = { ReadWriteOnce: true },
): string[] => {
  const createdStorageClasses: string[] = [];

  //Provision a disabled non-default sc
  const scNameDisabledNonDefault = `${scName}-disabled-non-default`;
  let SCReplacement: SCReplacements = {
    SC_NAME: scNameDisabledNonDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'false',
    SC_ACCESS_MODE: JSON.stringify(scAccessMode),
    SC_PROVISIONER: StorageProvisioner.CINDER_CSI,
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameDisabledNonDefault);

  //Provision an enabled non-default sc
  const scNameEnabledNonDefault = `${scName}-enabled-non-default`;
  SCReplacement = {
    SC_NAME: scNameEnabledNonDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
    SC_ACCESS_MODE: JSON.stringify(scAccessMode),
    SC_PROVISIONER: StorageProvisioner.CINDER_CSI,
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameEnabledNonDefault);

  //Provision an enabled non-default sc in order to set it as default
  const scNameEnabledToDefault = `${scName}-enabled-to-default`;
  SCReplacement = {
    SC_NAME: scNameEnabledToDefault,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
    SC_ACCESS_MODE: JSON.stringify(scAccessMode),
    SC_PROVISIONER: StorageProvisioner.CINDER_CSI,
  };
  createStorageClass(SCReplacement);
  createdStorageClasses.push(scNameEnabledToDefault);

  return createdStorageClasses;
};

/**
 * Provision (using oc) a storage class based on a given name, provisioner and access modes
 * @param scName Storage class name to create
 * @param provisioner Expected provisioner
 * @param scAccessMode Expected access mode
 */
export const provisionStorageClass = (
  scName: string,
  provisioner = StorageProvisioner.CINDER_CSI,
  scAccessMode: SCAccessMode = { ReadWriteOnce: true },
): string => {
  const SCReplacement: SCReplacements = {
    SC_NAME: scName,
    SC_IS_DEFAULT: 'false',
    SC_IS_ENABLED: 'true',
    SC_ACCESS_MODE: JSON.stringify(scAccessMode),
    SC_PROVISIONER: provisioner,
  };
  createStorageClass(SCReplacement);
  return scName;
};

export const tearDownStorageClassFeature = (createdSC: string[]): void => {
  createdSC.forEach((scName) => {
    cy.log(`Deleting storage class: ${scName}`);
    deleteStorageClass(scName);
  });
};

/**
 * Provision (using oc) all necessary resources for the Storage Class testing feature
 * (DSProject Cluster Storage tab)
 *
 * @param scName Project Name
 */
export const provisionClusterStorageSCFeature = (projectName: string, userName: string): void => {
  // Provision a Project
  createCleanProject(projectName);
  addUserToProject(projectName, userName);
};

/**
 * Delete (using oc) all created resources for the Storage Class testing feature
 * (DSProject Cluster Storage tab)
 *
 * @param scName Project Name
 */
export const tearDownClusterStorageSCFeature = (projectName: string): void => {
  // Delete provisioned projectName
  deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
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
    accessModeSettings: rawConfig.accessModeSettings,
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
 * @param expectedIsDefault (Optional) expected isDefault
 * @param expectedIsEnabled (Optional) expected isEnabled
 * @param expectedDisplayName (Optional) expected Display Name
 * @param expectedDescription (Optional) expected Description
 * @param expectedAccessModes (Optional) expected access modes
 */
export const verifyStorageClassConfig = (
  scName: string,
  expectedIsDefault?: boolean,
  expectedIsEnabled?: boolean,
  expectedDisplayName?: string,
  expectedDescription?: string,
  expectedAccessModes?: SCAccessMode,
): Cypress.Chainable<CommandLineResult> => {
  return getStorageClassConfig(scName).then((result) => {
    const config = parseStorageClassConfig(result);

    if (expectedIsDefault !== undefined) {
      cy.wrap(config.isDefault).should('equal', expectedIsDefault);
    }

    if (expectedIsEnabled !== undefined) {
      cy.wrap(config.isEnabled).should('equal', expectedIsEnabled);
    }

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

    if (expectedDescription !== undefined) {
      cy.wrap(config.accessModeSettings).should('equal', expectedAccessModes);
    }
    cy.log('Storage Class Config:', JSON.stringify(config));
    return cy.wrap(result);
  });
};
