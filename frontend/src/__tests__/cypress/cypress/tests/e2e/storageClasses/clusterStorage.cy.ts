import { TEST_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '~/__tests__/cypress/cypress/utils/storageClass';
import {
  clusterStorage,
  addClusterStorageModal,
} from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { findAddClusterStorageButton } from '~/__tests__/cypress/cypress/utils/clusterStorage';
import {
  getDefaultEnabledStorageClass,
  updateStorageClass,
} from '~/__tests__/cypress/cypress/utils/oc_commands/storageClass';
import type { SCReplacements } from '~/__tests__/cypress/cypress/types';

const scName = 'qe-cs-sc';
const dspName = 'qe-cluster-storage-sc-dsp';

describe('Regular Users can make use of the Storage Classes in the Cluster Storage tab from DSP ', () => {
  let createdStorageClasses: string[];
  before(() => {
    // Provision different SCs
    createdStorageClasses = provisionClusterStorageSCFeature(dspName, TEST_USER.USERNAME, scName);
  });

  after(() => {
    tearDownClusterStorageSCFeature(dspName, createdStorageClasses);
  });

  it('Regular user can create a cluster storage using a new storage class', () => {
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
    // Select the enabled SC and submit
    addClusterStorageModal.findStorageClassSelect().findSelectOption(scEnabledName).click();
    addClusterStorageModal.findSubmitButton().click();
    // Verify it's now in the grid
    const clusterStorageRow = clusterStorage.getClusterStorageRow(clusterStorageName);
    clusterStorageRow.findStorageClassColumn().should('exist');
  });

  it('A Cluster Storage with a disabled SC shows the deprecated warning', () => {
    cy.visitWithLogin('/projects', TEST_USER);
    // Open the project
    projectListPage.filterProjectByName(dspName);
    projectListPage.findProjectLink(dspName).click();
    // Go to cluster storage tab
    projectDetails.findSectionTab('cluster-storages').click();

    // Create a cluster storage using the new Storage Class
    const scEnabledName = `${scName}-enabled`;
    const clusterStorageName = `cs-deprecated`;
    findAddClusterStorageButton().click();
    addClusterStorageModal.findNameInput().fill(clusterStorageName);
    // Select the enabled SC and submit
    addClusterStorageModal.findStorageClassSelect().findSelectOption(scEnabledName).click();
    addClusterStorageModal.findSubmitButton().click();
    // Verify it's now in the grid
    let clusterStorageRow = clusterStorage.getClusterStorageRow(clusterStorageName);
    clusterStorageRow.findStorageClassColumn().should('exist');

    // patch: Disable the SC
    const SCReplacement: SCReplacements = {
      SC_NAME: scEnabledName,
      SC_IS_DEFAULT: 'false',
      SC_IS_ENABLED: 'false',
    };
    updateStorageClass(SCReplacement);

    cy.reload();
    clusterStorageRow = clusterStorage.getClusterStorageRow(clusterStorageName);
    clusterStorageRow.findDeprecatedLabel().should('exist');

    clusterStorageRow.findDeprecatedLabel().trigger('mouseenter');
    clusterStorageRow.shouldHaveDeprecatedTooltip();
    clusterStorage.shouldHaveDeprecatedAlertMessage();
    clusterStorage.closeDeprecatedAlert();
  });
});

/**
 * a modified SC shows deprecated
 * All except one are disabled -> dropdown disabled
 *
 */
