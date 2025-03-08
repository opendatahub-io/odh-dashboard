import type { WBImagesTestData } from '~/__tests__/cypress/cypress/types';
import { projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, createSpawnerPage } from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBImagesFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { getNotebookImageNames } from '~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';

const applicationNamespace = Cypress.env('TEST_NAMESPACE');

describe('Workbenches - image/version tests', () => {
  let projectName: string;

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBImagesFixture('e2e/dataScienceProjects/testWorkbenchImages.yaml')
      .then((fixtureData: WBImagesTestData) => {
        projectName = fixtureData.wbImagesTestNamespace;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });

  after(() => {
    if (!wasSetupPerformed()) return;

    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it(
    'Verifies that workbench images have an additional dropdown which supports N/N-1 image versions.',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-2131', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = projectName.replace('dsp-', '');

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      cy.visit(`projects/${projectName}?section=workbenches`);

      cy.step(`Create workbench ${workbenchName}`);
      workbenchPage.findCreateButton().click();

      // Get notebook images and versions
      getNotebookImageNames(applicationNamespace).then((imageInfos) => {
        imageInfos.forEach((info) => {
          cy.step(`Verify notebook image: ${info.image}`);
          createSpawnerPage.findNotebookImage(info.image).click();

          if (info.versions.length > 1) {
            cy.step(`Verify versions for image: ${info.image}`);
            cy.get('[data-testid="workbench-image-version-selection"]').should('exist');

            info.versions.forEach((version) => {
              cy.step(`Verify version: ${version} for image: ${info.image}`);
              createSpawnerPage.findNotebookVersion(version);

              // Verify that the selected version is displayed in the toggle button
              cy.get(
                '[data-testid="workbench-image-version-selection"] .pf-v6-c-menu-toggle__text',
              ).should('contain', version);
            });
          } else {
            cy.log(
              `Skipping version verification for ${info.image} as it has only one or no versions.`,
            );
            cy.get('[data-testid="workbench-image-version-selection"]').should('not.exist');
          }
        });
      });
    },
  );
});
