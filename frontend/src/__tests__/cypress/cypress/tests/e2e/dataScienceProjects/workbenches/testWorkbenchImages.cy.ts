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
import {
  getNotebookImageNames,
  type NotebookImageInfo,
} from '~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('Workbenches - image/version tests', () => {
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBImagesFixture('e2e/dataScienceProjects/testWorkbenchImages.yaml').then(
      (fixtureData: WBImagesTestData) => {
        projectName = `${fixtureData.wbImagesTestNamespace}-${uuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      },
    );
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
    { tags: ['@Sanity', '@SanitySet3', '@ODS-2131', '@Dashboard', '@Workbenches'] },
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

      // Get notebook images and verify them
      cy.wrap(null).then(() => {
        return getNotebookImageNames(applicationNamespace).then((imageInfos) => {
          if (!imageInfos || imageInfos.length === 0) {
            throw new Error('No notebook images found for verification');
          }

          cy.log(`Verifying ${imageInfos.length} notebook images`);

          // Chain the image verifications
          const verifyImages = (
            images: NotebookImageInfo[],
            index = 0,
          ): Cypress.Chainable<undefined> => {
            if (index >= images.length) {
              return cy.wrap(undefined);
            }

            const info = images[index];
            return cy
              .step(`Verify notebook image: ${info.image}`)
              .then(() => createSpawnerPage.findNotebookImage(info.image).click())
              .then(() => {
                if (info.versions.length > 1) {
                  return cy
                    .step(`Verify versions for image: ${info.image}`)
                    .then(() =>
                      cy.get('[data-testid="workbench-image-version-selection"]').should('exist'),
                    )
                    .then(() => {
                      // Chain the version verifications
                      const verifyVersions = (
                        versions: string[],
                        vIndex = 0,
                      ): Cypress.Chainable<undefined> => {
                        if (vIndex >= versions.length) {
                          return cy.wrap(undefined);
                        }

                        const version = versions[vIndex];
                        return cy
                          .step(`Verify version: ${version} for image: ${info.image}`)
                          .then(() => createSpawnerPage.findNotebookVersion(version))
                          .then(() =>
                            cy
                              .get(
                                '[data-testid="workbench-image-version-selection"] .pf-v6-c-menu-toggle__text',
                              )
                              .should('contain', version),
                          )
                          .then(() => verifyVersions(versions, vIndex + 1));
                      };

                      return verifyVersions(info.versions);
                    });
                }
                cy.log(
                  `Skipping version verification for ${info.image} as it has only one or no versions.`,
                );
                return cy
                  .get('[data-testid="workbench-image-version-selection"]')
                  .should('not.exist');
              })
              .then(() => verifyImages(images, index + 1));
          };

          return verifyImages(imageInfos);
        });
      });
    },
  );
});
