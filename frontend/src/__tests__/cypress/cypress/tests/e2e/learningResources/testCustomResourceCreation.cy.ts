import { loadResourcesFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import type { ResourcesData } from '#~/__tests__/cypress/cypress/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '#~/__tests__/cypress/cypress/pages/resources';
import {
  setupCustomResources,
  getResourceValues,
  cleanupCustomResources,
} from '#~/__tests__/cypress/cypress/utils/resourceUtils';
import { checkResources } from '#~/__tests__/cypress/cypress/utils/resourceCheckUtils';
import {
  retryableBefore,
  wasSetupPerformed,
} from '#~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Create a custom resource Quickstart by using Dashboard CRDs', () => {
  let resourcesData: ResourcesData;
  let resourceNames: ReturnType<typeof getResourceValues>;

  // Setup: Load test data and setup custom resources
  retryableBefore(() => {
    return loadResourcesFixture('e2e/learningResources/testCustomResourceCreation.yaml').then(
      (data) => {
        resourcesData = data;
        resourceNames = getResourceValues(resourcesData);
        cy.log(`Loaded resources data: ${JSON.stringify(resourcesData, null, 2)}`);

        const quickStartResource = resourcesData.resources.CustomQuickStart[0];
        cy.log(`YAML path for CustomQuickStart: ${quickStartResource.yamlPath}`);

        return setupCustomResources(resourcesData);
      },
    );
  });
  // Delete custom resources
  after(() => {
    //Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    return cleanupCustomResources(resourcesData);
  });

  it(
    'Upload custom resource and verify',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-697', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Resources tab and search for the Custom Resources');
      resources.visit();

      // Verify the resources have been created by iterating over the resources created in the before method
      cy.step('Check for newly created resources');
      checkResources([
        {
          name: resourceNames.quickStartName,
          metaDataName: resourceNames.quickStartMetaDataName,
          description: resourceNames.quickStartDescription,
        },
        {
          name: resourceNames.applicationName,
          metaDataName: resourceNames.customAppMetaDataName,
          description: resourceNames.customAppDescription,
        },
        {
          name: resourceNames.howToName,
          metaDataName: resourceNames.howToMetaDataName,
          description: resourceNames.howToDescription,
        },
        {
          name: resourceNames.tutorialName,
          metaDataName: resourceNames.tutorialMetaDataName,
          description: resourceNames.tutorialDescription,
        },
      ]);
    },
  );
});
