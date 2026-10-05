import { NotebookStatusLabel } from '../../../../types';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import { workbenchPage, createSpawnerPage } from '../../../../pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { loadWBNodeSelectorsFixture } from '../../../../utils/dataLoader';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import {
  validateWorkbenchNodeSelectors,
  validateWorkbenchTolerations,
} from '../../../../utils/oc_commands/workbench';
import { retryableBefore } from '../../../../utils/retryableHooks';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import type { WBNodeSelectorsTestData } from '../../../../types';

describe('Workbenches - node selector tests', () => {
  let testData: WBNodeSelectorsTestData;
  let projectName: string;
  const projectUuid = generateTestUUID();

  retryableBefore(() =>
    loadWBNodeSelectorsFixture('e2e/hardwareProfiles/testWorkbenchNodeSelectors.yaml')
      .then((fixtureData: WBNodeSelectorsTestData) => {
        testData = fixtureData;
        projectName = `${fixtureData.testNamespace}-${projectUuid}`;

        // Label all worker nodes so pods with the test nodeSelector can schedule
        cy.log(
          `Labeling all worker nodes with ${testData.nodeSelectorKey}=${testData.nodeSelectorValue}`,
        );
        return cy.exec(
          `oc label nodes -l node-role.kubernetes.io/worker ${testData.nodeSelectorKey}=${testData.nodeSelectorValue} --overwrite`,
          { failOnNonZeroExit: true },
        );
      })
      .then(() => {
        cy.log(`Creating project: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Creating Hardware Profile A: ${testData.hardwareProfileNameA}`);
        createCleanHardwareProfile(testData.resourceYamlPathA);
      })
      .then(() => {
        cy.log(`Creating Hardware Profile B: ${testData.hardwareProfileNameB}`);
        createCleanHardwareProfile(testData.resourceYamlPathB);
      }),
  );

  after(() => {
    cy.log(`Cleaning up Hardware Profile A: ${testData.hardwareProfileNameA}`);
    cleanupHardwareProfiles(testData.hardwareProfileNameA)
      .then(() => {
        cy.log(`Cleaning up Hardware Profile B: ${testData.hardwareProfileNameB}`);
        return cleanupHardwareProfiles(testData.hardwareProfileNameB);
      })
      .then(() => {
        if (testData.nodeSelectorKey) {
          cy.log(`Removing label ${testData.nodeSelectorKey} from all worker nodes`);
          return cy.exec(
            `oc label nodes -l node-role.kubernetes.io/worker ${testData.nodeSelectorKey}- --ignore-not-found`,
            { failOnNonZeroExit: false },
          );
        }
        return cy.wrap(null);
      })
      .then(() => {
        if (projectName) {
          cy.log(`Deleting project: ${projectName}`);
          return deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
        }
        return cy.wrap(null);
      });
  });

  it(
    'Verify node selectors from hardware profile are applied to workbench pod',
    { tags: ['@Dashboard', '@HardwareProfiles', '@Sanity', '@SanitySet2', '@HardwareProfilesCI'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      cy.step(
        `Create workbench ${testData.workbenchNameA} with node-selector-only hardware profile`,
      );
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchNameA);
      createSpawnerPage.getDescriptionInput().type(testData.testDescription);
      createSpawnerPage.findNotebookImage(testData.notebookImageName).click();
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSizeA,
        testData.hardwareProfileNameA,
      );
      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${testData.workbenchNameA} to reach Running status`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchNameA);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 120000);

      cy.step('Validate node selectors are applied to the workbench pod');
      validateWorkbenchNodeSelectors(projectName, testData.workbenchNameA, {
        [testData.nodeSelectorKey]: testData.nodeSelectorValue,
      }).then((podName) => {
        cy.log(
          `Pod ${podName} has node selector ${testData.nodeSelectorKey}=${testData.nodeSelectorValue} as expected`,
        );
      });
    },
  );

  it(
    'Verify node selectors and tolerations are both applied when hardware profile has both',
    { tags: ['@Dashboard', '@HardwareProfiles', '@Sanity', '@SanitySet2', '@HardwareProfilesCI'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      cy.step(`Create workbench ${testData.workbenchNameB} with combined hardware profile`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchNameB);
      createSpawnerPage.getDescriptionInput().type(testData.testDescription);
      createSpawnerPage.findNotebookImage(testData.notebookImageName).click();
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSizeB,
        testData.hardwareProfileNameB,
      );
      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${testData.workbenchNameB} to reach Running status`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchNameB);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 240000);

      cy.step('Validate node selectors are applied to the workbench pod');
      validateWorkbenchNodeSelectors(projectName, testData.workbenchNameB, {
        [testData.nodeSelectorKey]: testData.nodeSelectorValue,
      }).then((podName) => {
        cy.log(
          `Pod ${podName} has node selector ${testData.nodeSelectorKey}=${testData.nodeSelectorValue} as expected`,
        );
      });

      cy.step('Validate tolerations are also applied to the workbench pod');
      validateWorkbenchTolerations(
        projectName,
        testData.workbenchNameB,
        testData.tolerationValue,
        true,
      ).then((podName) => {
        cy.log(`Pod ${podName} has toleration ${testData.tolerationValue} as expected`);
      });
    },
  );
});
