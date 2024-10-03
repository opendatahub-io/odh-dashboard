import { TEST_USER, ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  verifyStorageClassConfig,
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '~/__tests__/cypress/cypress/utils/storageClass';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  storageClassEditModal,
  storageClassesPage,
  storageClassesTable,
} from '~/__tests__/cypress/cypress/pages/storageClasses';
import { getDefaultEnabledStorageClass } from '../../../utils/oc_commands/storageClass';

const scName = 'qe-cs-sc';
const scDefaultName = 'standard-csi';
const dspName = 'qe-cluster-storage-sc-dsp';
// const dspName = 'fede';

// Using testIsolation will reuse the login (cache)
// describe('An admin user can manage Storage Classes', { testIsolation: false }, () => {
describe('An admin user can manage Storage Classes from Settings -> Storage classes view', () => {
  let createdStorageClasses: string[];
  // before(() => {
  //   // Provision different SCs
  //   createdStorageClasses = provisionClusterStorageSCFeature(dspName, TEST_USER.USERNAME, scName);
  // });

  // after(() => {
  //   tearDownClusterStorageSCFeature(dspName, createdStorageClasses);
  // });

  it.only('Regular user can create a cluster storage using a new storage class', () => {
    // Login as a regular user and try to land in storage classes view
    cy.visitWithLogin('/projects', TEST_USER);
    // Open the project
    projectListPage.filterProjectByName(dspName);
    projectListPage.findProjectLink(dspName).click();
    // Go to cluster storage tab
    projectDetails.findSectionTab('cluster-storages').click();

    // Create a cluster storage using the new Storage Class
    const scEnabledName = `${scName}-enabled`;
    const scDisabledName = `${scName}-disabled`;
    const clusterStorageName = `cs-${scEnabledName}`;
    clusterStorage.findCreateButton().click();
    addClusterStorageModal.findNameInput().fill(clusterStorageName);
    // Verify that the sc selected by default is the default one
    getDefaultEnabledStorageClass().then((storageClassName) => {
      cy.findByTestId('storage-classes-selector')
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();
          expect(trimmedText).to.equal(storageClassName);
        });
      // Verify that the default one has the label
      addClusterStorageModal.findStorageClassSelect().click();
      cy.findByTestId(storageClassName).within(() => {
        cy.findByTestId('is-default-label').should('exist').and('have.text', 'Default class');
      });
    });

    // Verify that the enabled SC is shown in the dropdown and the disabled one is not
    addClusterStorageModal
      .findStorageClassSelect()
      .findSelectOption(scDisabledName)
      .should('not.exist');
    addClusterStorageModal.findStorageClassSelect().findSelectOption(scEnabledName).should('exist');
    addClusterStorageModal.findStorageClassSelect().findSelectOption(scEnabledName).click();
  });
});

/**
 * disabled ones does not appears
 * All except one are disabled -> dropdown disabled
 *
 */
