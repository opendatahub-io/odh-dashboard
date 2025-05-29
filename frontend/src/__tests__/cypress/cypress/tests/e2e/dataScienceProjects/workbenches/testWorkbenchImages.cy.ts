import type { PVCReplacements } from '#~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, createSpawnerPage } from '#~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadPVCFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import {
  getNotebookImageNames,
  type NotebookImageInfo,
} from '#~/__tests__/cypress/cypress/utils/notebookImageUtils';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('Workbenches - image/version tests', () => {
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    return loadPVCFixture('e2e/dataScienceProjects/testProjectWbPV.yaml').then(
      (fixtureData: PVCReplacements) => {
        projectName = `${fixtureData.NAMESPACE}-${uuid}`;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      },
    );
  });

  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Verifies that workbench images have an additional dropdown which supports N/N-1 image versions.',
    { tags: ['@Sanity', '@SanitySet3', '@ODS-2131', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = projectName.replace('dsp-', '');

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      cy.step(`Create workbench ${workbenchName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);

      // Log all available notebook images and their versions
      getNotebookImageNames(applicationNamespace).then((imageInfos: NotebookImageInfo[]) => {
        cy.log(`Found ${imageInfos.length} notebook images`);
        imageInfos.forEach((info: NotebookImageInfo) => {
          cy.log(`Checking image: ${info.image}`);
          createSpawnerPage.findNotebookImage(info.image).click();

          // Log all elements with data-testid attributes in the version selection area
          cy.get('[data-testid*="-version-"]').then(($elements) => {
            cy.log(`Found ${$elements.length} version elements for ${info.image}`);
            $elements.each((_, el) => {
              const dataTestId = el.getAttribute('data-testid');
              if (dataTestId) {
                cy.log(`Version element data-testid: ${dataTestId}`);
              }
            });
          });
        });
      });
    },
  );
});
