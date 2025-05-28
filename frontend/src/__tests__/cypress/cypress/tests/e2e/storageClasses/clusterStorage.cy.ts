import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '~/__tests__/cypress/cypress/utils/storageClass';
import { addClusterStorageModal } from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { findAddClusterStorageButton } from '~/__tests__/cypress/cypress/utils/clusterStorage';
import { disableNonDefaultStorageClasses } from '~/__tests__/cypress/cypress/utils/oc_commands/storageClass';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';

const dspName = 'qe-cluster-storage-sc-dsp';

describe('Regular Users can make use of the Storage Classes in the Cluster Storage tab from DSP ', () => {
  retryableBefore(() => {
    provisionClusterStorageSCFeature(dspName, LDAP_CONTRIBUTOR_USER.USERNAME);
  });

  after(() => {
    tearDownClusterStorageSCFeature(dspName);
  });

  // TODO: This test is failing due to https://issues.redhat.com/browse/RHOAIENG-16609

  it(
    'If all SC are disabled except one, the SC dropdown should be disabled',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.visitWithLogin('/projects', LDAP_CONTRIBUTOR_USER);
      // Open the project
      cy.step(`Navigate to the Project list tab and search for ${dspName}`);
      projectListPage.filterProjectByName(dspName);
      projectListPage.findProjectLink(dspName).click();
      cy.step('Navigate to the Cluster Storage tab and disable all non-default storage classes');
      // Go to cluster storage tab
      projectDetails.findSectionTab('cluster-storages').click();
      // Disable all non-default storage classes
      disableNonDefaultStorageClasses().then(() => {
        // Open the Create cluster storage Modal
        findAddClusterStorageButton().click();

        cy.step('Checking that Storage Classes Dropdown is disabled');
        // Check that the SC Dropdown is disabled
        addClusterStorageModal.findStorageClassSelect().should('be.disabled');
      });
    },
  );
});
