import { LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import {
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '../../../utils/storageClass';
import { addClusterStorageModal, clusterStorage } from '../../../pages/clusterStorage';
import { projectDetails, projectListPage } from '../../../pages/projects';
import {
  deleteStorageClass,
  disableNonDefaultStorageClasses,
  ensureOpenshiftDefaultStorageClass,
} from '../../../utils/oc_commands/storageClass';
import { retryableBefore } from '../../../utils/retryableHooks';

const dspName = 'qe-cluster-storage-sc-dsp';
const testDefaultScName = 'test-default-sc';

describe('Regular Users can make use of the Storage Classes in the Cluster Storage tab from Pipelines ', () => {
  let createdDefaultSc = false;

  retryableBefore(() => {
    // Ensure an OpenShift default storage class exists before running tests.
    // If no storage classes exist (e.g., disconnected environments), one will be created.
    ensureOpenshiftDefaultStorageClass().then((defaultSC) => {
      cy.log(`Using OpenShift default storage class: ${defaultSC}`);
      // Track if we created the default SC so we can clean it up
      if (defaultSC === testDefaultScName) {
        createdDefaultSc = true;
      }
    });

    provisionClusterStorageSCFeature(dspName, LDAP_CONTRIBUTOR_USER.USERNAME);
  });

  after(() => {
    tearDownClusterStorageSCFeature(dspName);

    // Clean up the default SC if we created it
    if (createdDefaultSc) {
      deleteStorageClass(testDefaultScName);
    }
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
        clusterStorage.findAddClusterStorageButton().click();

        cy.step('Checking that Storage Classes Dropdown is disabled');
        // Check that the SC Dropdown is disabled
        addClusterStorageModal.findStorageClassSelect().find().should('be.disabled');
      });
    },
  );
});
