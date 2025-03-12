import { hardwareProfile, createHardwareProfile } from "~/__tests__/cypress/cypress/pages/hardwareProfile";
import { HTPASSWD_CLUSTER_ADMIN_USER } from "~/__tests__/cypress/cypress/utils/e2eUsers";
import { HardwareProfilesData } from "~/__tests__/cypress/cypress/types";

describe('Test Hardware Profiles', () => {
    let testData: HardwareProfilesData;

    it('Create and Delete a Hardware Profile',
        { tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@HardwareProfile'] },
        () => {

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Hardware Profiles
      cy.step('Navigate to Hardware Profiles');
      hardwareProfile.navigate();

      // Create a Hardware Profile
      cy.step('Create a Hardware Profile and confirm creation');
      hardwareProfile.findCreateButton().click();
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill('Test hardware profile');
      
    });
});