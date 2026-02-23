import {
  ModelLocationSelectOption,
  ModelTypeLabel,
  ModelStateToggleLabel,
} from '@odh-dashboard/model-serving/types/form-data';
import {
  tiersPage,
  createTierPage,
  tierDetailsPage,
  deleteTierModal,
  maasWizardField,
} from '../../../../pages/modelsAsAService';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { loadTiersFixture, loadDSPFixture } from '../../../../utils/dataLoader';
import type { TiersTestData, DataScienceProjectData } from '../../../../types';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import {
  modelServingGlobal,
  modelServingWizard,
  modelServingSection,
  deleteModelServingModal,
} from '../../../../pages/modelServing';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';
import { patchOpenShiftResource } from '../../../../utils/oc_commands/baseCommands';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { addUserToProject, deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';

describe('Verify Tiers Creation and Deploy Model with Tier and Delete Tier', () => {
  let testData: TiersTestData;
  let projectName: string;
  let contributor: string;
  let name: string;
  let description: string;
  let groups: string[];
  let tokenRateLimit: {
    count: string;
    time: string;
    unit: string;
  };
  let requestRateLimit: {
    count: string;
    time: string;
    unit: string;
  };
  let groupsCount: number;
  let limits: string;
  let dspTestData: DataScienceProjectData;
  let modelName: string;
  let modelURI: string;
  let servingRuntime: string;
  let resourceType: string;
  let Image: string;
  let hardwareProfileResourceName: string;
  let hardwareProfileYamlPath: string;
  let groupsString: string;
  const uuid: string = generateTestUUID();
  retryableBefore(() => {
    loadTiersFixture('e2e/settings/tiers/testTiersAdminCapabilities.yaml').then(
      (fixtureData: TiersTestData) => {
        testData = fixtureData;
        name = `${testData.name}-${uuid}`;
        description = testData.description;
        groups = testData.groups;
        tokenRateLimit = testData.tokenRateLimit;
        requestRateLimit = testData.requestRateLimit;
        groupsCount = testData.groupsCount;
        limits = testData.limits;
        groupsString = '';
      },
    );
    loadDSPFixture('e2e/dataScienceProjects/testDeployLLMDServing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        dspTestData = fixtureData;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        projectName = `${dspTestData.projectResourceName}-${uuid}`;
        modelName = dspTestData.singleModelName;
        modelURI = dspTestData.modelLocationURI;
        servingRuntime = dspTestData.servingRuntime;
        hardwareProfileResourceName = `${dspTestData.hardwareProfileName}`;
        hardwareProfileYamlPath = `resources/yaml/llmd-hardware-profile.yaml`;
        resourceType = dspTestData.resourceType;
        Image = dspTestData.Image;
      })
      .then(() => {
        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
        addUserToProject(projectName, contributor, 'edit');
        // Load Hardware Profile
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        // Cleanup Hardware Profile if it already exists
        createCleanHardwareProfile(hardwareProfileYamlPath);
      });
  });

  after(() => {
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up Hardware Profile: ${dspTestData.hardwareProfileName}`);
    // Call cleanupHardwareProfiles with the actual name from the YAML file
    cleanupHardwareProfiles(hardwareProfileResourceName);
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });
  it(
    'Verify Tiers Creation and Deploy Model with Tier and Delete Tier',
    {
      tags: ['@Smoke', '@Dashboard', '@Tiers', '@devFeatureFlags'],
    },
    () => {
      cy.step('Log into the application as cluster admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Tiers page');
      tiersPage.visit();

      cy.step('Create a new tier');
      tiersPage.findCreateTierButton().click();
      createTierPage.findNameInput().clear().type(name);
      createTierPage.findDescriptionInput().clear().type(description);
      // verify the level is populated by default
      createTierPage.findLevelInput().should('not.have.value', '');
      createTierPage.findLevelInput().should('be.visible').invoke('val').as('level');
      // update the groups selection
      for (const group of groups) {
        createTierPage.selectGroupsOption(group);
        groupsString += `${group}`;
      }
      createTierPage.findTokenRateLimitCheckbox().click();
      createTierPage.findTokenRateLimitCountInput(0).clear().type(tokenRateLimit.count);
      createTierPage.findTokenRateLimitTimeInput(0).clear().type(tokenRateLimit.time);
      createTierPage.selectTokenRateLimitUnit(0, 'hour');
      createTierPage.findRequestRateLimitCheckbox().click();
      createTierPage.findRequestRateLimitCountInput(0).clear().type(requestRateLimit.count);
      createTierPage.findRequestRateLimitTimeInput(0).clear().type(requestRateLimit.time);
      createTierPage.selectRequestRateLimitUnit(0, 'second');
      createTierPage.findLevelTakenError().should('not.exist');
      createTierPage.findCreateButton().should('exist').should('be.enabled').click();

      cy.step('Verify the tier is created');
      tiersPage.findRows().contains(name).should('exist');

      cy.step('View the tiers details');
      tiersPage.findKebab(name).click();
      tiersPage.findViewDetailsButton().click();
      tierDetailsPage.findName().should('contain.text', name);
      tierDetailsPage.findDescription().should('contain.text', description);
      tierDetailsPage.findLevel().should('not.be.empty');
      tierDetailsPage.findGroups().should('contain.text', groupsString);
      tierDetailsPage
        .findLimits(`${tokenRateLimit.count} tokens per ${tokenRateLimit.time} hour`)
        .should('exist');

      cy.step('Edit the tier');
      tierDetailsPage.findActionsButton().click();
      tierDetailsPage.findActionsEditButton().should('exist').click();
      // update the description and groups and limits
      createTierPage.findDescriptionInput().clear().type(`${description} - updated`);
      createTierPage.findLevelInput().should('not.have.value', '');
      createTierPage.selectGroupsOption('tier-free-users');
      createTierPage.findTokenRateLimitPlusButton(0).click();
      createTierPage.selectTokenRateLimitUnit(0, 'minute');
      createTierPage.findRequestRateLimitMinusButton(0).click();
      createTierPage.selectRequestRateLimitUnit(0, 'ms');
      createTierPage.findUpdateButton().should('be.enabled').click();

      cy.step('Verify the tier is edited');
      let tierRow = tiersPage.getRow(name);
      tierRow.findName().should('contain.text', name);
      // Verify the description is updated
      tierRow.findDescription().should('contain.text', `${description} - updated`);
      tierRow.findLevel().should('not.be.empty');
      // Verify the grouo count is increased by 1
      tierRow.findGroups().should('contain.text', `${groupsCount} Group`);
      // Verify the limits are updated
      tierRow.findLimits().should('contain.text', limits);

      cy.step('Deploy model with this test Resource Tier');
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard.findSaveConnectionInput().clear().type(`${modelName}-connection`);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .as('resourceName');
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(servingRuntime).should('exist').click();
      modelServingWizard.findNextButton().should('be.enabled').click();
      // Check the Save as MaaS checkbox and select the Specific tiers option and set the created tier name
      maasWizardField.findSaveAsMaaSCheckbox().click();
      maasWizardField.selectMaaSTierOption('Specific tiers');
      maasWizardField.selectMaaSTierNames([name]);

      modelServingWizard.findNextButton().click();
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);
      const kServeRow = modelServingSection.getKServeRow(modelName);
      cy.get<string>('@resourceName').then((resourceName) => {
        patchOpenShiftResource(resourceType, resourceName, Image, projectName);

        cy.step('Verify that the Model is ready');
        checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });
        kServeRow.findStateActionToggle().should('have.text', ModelStateToggleLabel.STOP).click();
        kServeRow.findConfirmStopModalButton().click();
        checkLLMInferenceServiceState(resourceName, projectName, {
          checkReady: false,
          checkStopped: true,
          requireLoadedState: false,
        });
      });
      kServeRow.find().findKebabAction('Delete').click();
      deleteModelServingModal.findInput().clear().type(modelName);
      deleteModelServingModal.findSubmitButton().should('be.enabled').click();

      cy.step('Log into the application as cluster admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify Level Error');
      // create a new tier with the same name and level to verify the level and name error
      tiersPage.visit();
      tiersPage.findCreateTierButton().click();
      createTierPage.findNameInput().clear().type(name);
      createTierPage.findNameTakenError().should('exist');
      cy.get<string>('@level').then((level) => {
        createTierPage.findLevelInput().clear().type(level);
        createTierPage.findLevelTakenError().should('exist');
      });
      // The create Tier button should be disabled and cancel the tier creation
      createTierPage.findCreateButton().should('be.disabled');
      createTierPage.findCancelButton().click();

      cy.step('Click Edit Tiers and cancel the edit');
      tierRow = tiersPage.getRow(name);
      tierRow.findEditButton().click();
      // update the description and cancel the edit.
      createTierPage.findDescriptionInput().clear().type(`${description} - updated-1`);
      createTierPage.findCancelButton().click();
      // Verify the description is not updated
      tierRow.findDescription().should('contain.text', `${description} - updated`);

      cy.step('Verify the tier is deleted');
      tierRow = tiersPage.getRow(name);
      tierRow.findDeleteButton().click();
      // Enter invalid tier name to verify the delete button is disabled and cancel the delete
      deleteTierModal.findInput().clear().type(testData.name);
      deleteTierModal.findSubmitButton().should('be.disabled');
      deleteTierModal.findCancelButton().click();
      // Delete the tier from View Details Page
      tierRow.findViewDetailsButton().click();
      tierDetailsPage.findActionsButton().click();
      tierDetailsPage.findActionsDeleteButton().should('exist').click();
      deleteTierModal.findInput().clear().type(name);
      deleteTierModal.findSubmitButton().should('be.enabled').click();
      // Verify the tier is deleted
      tiersPage.findRows().should('not.contain', name);
    },
  );
});
