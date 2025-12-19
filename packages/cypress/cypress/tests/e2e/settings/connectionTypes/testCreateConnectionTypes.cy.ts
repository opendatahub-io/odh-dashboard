import {
  connectionTypePreviewModal,
  connectionTypeSectionModal,
  connectionTypesPage,
  createConnectionTypePage,
} from '../../../../pages/connectionTypes';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { connectionsPage, addConnectionModal } from '../../../../pages/connections';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { OOTBConnectionTypesData } from '../../../../types';
import { createCleanProject } from '../../../../utils/projectChecker';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { deleteConnectionTypeByName } from '../../../../utils/oc_commands/connectionTypes';
import { modelServingWizard, modelServingGlobal } from '../../../../pages/modelServing';

describe('Verify Connection Type Creation', () => {
  let testData: OOTBConnectionTypesData;
  let connectionTypeName: string;
  let existingConnectionTypeName: string;
  let duplicateConnectionTypeName: string;
  const uuid = generateTestUUID();
  let projectName: string;
  let connectionTypeDescription: string;
  let connectionTypeCategory: string[];
  let connectionTypeModelServingCompatibleType: string[];
  let connectionTypeSectionHeading: string;
  let connectionTypeSectionHeadingDescription: string;
  let connectionTypeAddFieldName: string;
  let connectionTypeAddFieldDescription: string;
  let connectionTypeAddFieldType: string;
  let connectionTypeAddFieldDefaultValue: string;
  let modelLocation: string;
  retryableBefore(() => {
    cy.log('Loading test data');
    return (
      loadDSPFixture(
        'e2e/settings/connectionTypes/testCreateConnectionTypes.yaml',
      ) as unknown as Cypress.Chainable<OOTBConnectionTypesData>
    ).then((fixtureData: OOTBConnectionTypesData) => {
      testData = fixtureData;
      projectName = `${testData.projectResourceName}-${uuid}`;
      connectionTypeName = `${testData.connectionTypeName}-${uuid}`;
      existingConnectionTypeName = `${testData.s3}`;
      duplicateConnectionTypeName = `Copy of ${existingConnectionTypeName}`;
      connectionTypeDescription = `${testData.connectionTypeDescription}`;
      connectionTypeCategory = testData.connectionTypeCategory;
      connectionTypeModelServingCompatibleType = testData.connectionTypeModelServingCompatibleType;
      connectionTypeSectionHeading = testData.connectionTypeSectionHeading;
      connectionTypeSectionHeadingDescription = testData.connectionTypeSectionHeadingDescription;
      connectionTypeAddFieldName = testData.connectionTypeAddFieldName;
      connectionTypeAddFieldDescription = testData.connectionTypeAddFieldDescription;
      connectionTypeAddFieldType = testData.connectionTypeAddFieldType;
      connectionTypeAddFieldDefaultValue = testData.connectionTypeAddFieldDefaultValue;
      modelLocation = testData.modelLocation;
      if (!projectName) {
        throw new Error('Project name is undefined or empty in the loaded fixture');
      }
      cy.log(`Loaded project name: ${projectName}`);
      createCleanProject(projectName);
    });
  });

  after(() => {
    // Delete createdconfigmaps in this e2e test
    deleteConnectionTypeByName(
      `ct-${connectionTypeName.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-')}`,
    );
    deleteConnectionTypeByName(
      `ct-${duplicateConnectionTypeName.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-')}`,
    );
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify User Can Create, Preview and Delete a Connection Type',
    {
      tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@ConnectionTypes'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Connection Types page');
      connectionTypesPage.navigate();
      connectionTypesPage.findCreateConnectionTypeButton().click();

      cy.step('Verify Create Connection Type page is displayed');
      createConnectionTypePage.findConnectionTypeName().clear().type(connectionTypeName);
      createConnectionTypePage.findConnectionTypeDesc().clear().type(connectionTypeDescription);

      cy.step('Select category');
      const categorySection = createConnectionTypePage.getCategorySection();
      categorySection.findCategoryTable();
      categorySection.findMultiGroupSelectButton(connectionTypeCategory[0]).click();
      categorySection.findMultiGroupSelectButton(connectionTypeCategory[1]).click();
      categorySection.findCategoryTable();

      cy.step('Select model serving compatible type');
      createConnectionTypePage
        .findModelServingCompatibleTypeDropdown()
        .findDropdownItem(connectionTypeModelServingCompatibleType[0])
        .click();
      createConnectionTypePage
        .findModelServingCompatibleTypeDropdown()
        .findDropdownItem(connectionTypeModelServingCompatibleType[1])
        .click();

      cy.step('Add new section heading');
      createConnectionTypePage.findAddSectionHeading().click();
      connectionTypeSectionModal
        .findAddSectionHeadingName()
        .clear()
        .type(connectionTypeSectionHeading);
      connectionTypeSectionModal
        .findAddSectionHeadingDesc()
        .clear()
        .type(connectionTypeSectionHeadingDescription);
      connectionTypeSectionModal.findAddSectionHeadingSubmitButton().click();
      createConnectionTypePage.findAddFieldButton().click();
      connectionTypeSectionModal.findAddFieldName().clear().type(connectionTypeAddFieldName);
      connectionTypeSectionModal.findAddFieldDesc().clear().type(connectionTypeAddFieldDescription);
      connectionTypeSectionModal.findAddFieldEnvVar().should('not.have.value', '');
      connectionTypeSectionModal.findAddFieldType().click();
      connectionTypeSectionModal
        .findAddFieldType()
        .findSelectOption(connectionTypeAddFieldType)
        .click();
      connectionTypeSectionModal.findAddFieldRequired().click();
      connectionTypeSectionModal
        .findAddFieldDefaultValue()
        .clear()
        .type(connectionTypeAddFieldDefaultValue);
      connectionTypeSectionModal.findAddFieldSubmitButton().click();

      cy.step('Submit the form to create the connection type');
      createConnectionTypePage.findSubmitButton().click();

      cy.step('Verify we are redirected to Connection Types list page');
      connectionTypesPage.shouldHaveConnectionTypes();

      cy.step('Verify the created connection type appears in the list');
      let createdRow = connectionTypesPage.getConnectionTypeRow(connectionTypeName);
      createdRow.shouldHaveName(connectionTypeName);
      createdRow.shouldHaveDescription(connectionTypeDescription);

      cy.step('Verify the connection type is enabled by default');
      createdRow.shouldBeEnabled();

      cy.step('Verify the connection type shows compatibility with model serving');
      createdRow.findConnectionTypeCompatibility().should('contain.text', 'URI');

      cy.step('Preview connection type.');
      createdRow.findKebab().click();
      createdRow.findKebabAction('Preview').click();
      connectionTypePreviewModal.shouldBeOpen();
      // Verify the new fields are displayed in the preview modal
      // Validate the connection type name in the preview
      connectionTypePreviewModal
        .findPreviewConnectionTypeName()
        .should('have.value', connectionTypeName);
      connectionTypePreviewModal.findPreviewNumericField().should('exist');
      connectionTypePreviewModal.findCloseButton().click();
      connectionTypePreviewModal.shouldBeOpen(false);

      // Project navigation
      cy.step(`Navigate to the Connections tab and validate the connection type is available`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('connections').click();
      connectionsPage.findCreateConnectionButton().click();
      addConnectionModal.findConnectionTypeDropdown().click();
      addConnectionModal.findConnectionTypeOption(connectionTypeName).should('exist');
      addConnectionModal.findCloseButton().click();

      // Delete the Connection type and confirm that the deletion was successful
      cy.step(
        'Navigate to connection type page and Delete the new created Connection type, verify deletion',
      );
      connectionTypesPage.navigate();
      createdRow = connectionTypesPage.getConnectionTypeRow(connectionTypeName);
      createdRow.findKebab().click();
      createdRow.findKebabAction('Delete').click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(connectionTypeName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      connectionTypesPage.findTable().contains(connectionTypeName).should('not.exist');

      cy.step(`Navigate to the Connections tab and validate the connection type is not available`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('connections').click();
      connectionsPage.findCreateConnectionButton().click();
      addConnectionModal.findConnectionTypeDropdown().click();
      addConnectionModal.findConnectionTypeOption(connectionTypeName).should('not.exist');
      addConnectionModal.findCloseButton().click();
    },
  );

  it(
    'Verify User Can Duplicate, Edit and Delete a Connection Type',
    {
      tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@ConnectionTypes'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Connection Types page');
      connectionTypesPage.navigate();

      cy.step('Duplicate the Connection type');
      const exisitingRow = connectionTypesPage.getConnectionTypeRow(existingConnectionTypeName);
      exisitingRow.findKebab().click();
      exisitingRow.findKebabAction('Duplicate').click();
      createConnectionTypePage
        .findConnectionTypeName()
        .should('have.value', duplicateConnectionTypeName);
      createConnectionTypePage.findSubmitButton().should('be.enabled').click();

      cy.step('Edit the Connection type');
      let duplicateRow = connectionTypesPage.getConnectionTypeRow(duplicateConnectionTypeName);
      duplicateRow.findKebab().click();
      duplicateRow.findKebabAction('Edit').click();
      createConnectionTypePage
        .findModelServingCompatibleTypeDropdown()
        .findDropdownItem('URI')
        .click();
      createConnectionTypePage.findSubmitButton().should('be.enabled').click();

      // Project navigation
      cy.step(`Navigate to the Deployments tab and validate the connection type is available`);
      projectListPage.visit();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();
      modelServingWizard.findModelLocationSelectOption(modelLocation).click();
      modelServingWizard
        .findCustomModelLocationSelectOption(duplicateConnectionTypeName)
        .should('exist');
      modelServingWizard.findCancelButton().click();
      modelServingWizard.findDiscardButton().click();

      // Delete the Connection type and confirm that the deletion was successful
      cy.step(
        'Navigate to connection type page and Delete the new created Connection type, verify deletion',
      );
      connectionTypesPage.navigate();
      duplicateRow = connectionTypesPage.getConnectionTypeRow(duplicateConnectionTypeName);
      duplicateRow.findKebab().click();
      duplicateRow.findKebabAction('Delete').click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(duplicateConnectionTypeName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      connectionTypesPage.findTable().contains(duplicateConnectionTypeName).should('not.exist');

      cy.step(`Navigate to the Deployments tab and validate the connection type is not available`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();
      modelServingWizard.findModelLocationSelectOption(modelLocation).click();
      modelServingWizard.findCustomModelLocationSelect().should('not.exist');
    },
  );
});
