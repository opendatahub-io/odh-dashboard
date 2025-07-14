import type { NotebookImageInfo } from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';
import { workbenchPage } from '#~/__tests__/cypress/cypress/pages/workbench';

/**
 * Verifies notebook images and their versions
 */
export const verifyNotebookImages = (imageInfos: NotebookImageInfo[]): void => {
  cy.then(() => {
    imageInfos.forEach((info) => {
      cy.step(`Verify notebook image: ${info.image}`);
      workbenchPage.findCreateButton().click();

      if (info.versions.length > 1) {
        cy.step(`Verify versions for image: ${info.image}`);
        cy.findByTestId('workbench-image-version-selection').should('exist');

        // Verify first version is selectable
        cy.findByTestId('workbench-image-version-selection').click();
        cy.findByTestId('workbench-image-version-option').contains(info.versions[0]).click();
      } else {
        cy.log(`Skipping verification for ${info.image} as it has only one or no versions.`);
        cy.findByTestId('workbench-image-version-selection').should('not.exist');
      }
    });
  });
};
