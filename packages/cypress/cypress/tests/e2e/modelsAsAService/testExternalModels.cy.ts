import yaml from 'js-yaml';
import {
  cleanupExternalModelsResources,
  createExternalModel,
  createExternalProvider,
  createExternalProviderSecret,
  createMaaSModelRefForExternalModel,
  waitForExternalModelGovernancePending,
} from '../../../utils/oc_commands/maas';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import { externalModelsPage } from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const uuid = generateTestUUID();

let projectWithModels: string;
let emptyProject: string;
let resourceName: string;

describe('External models read-only list', () => {
  retryableBefore(() => {
    cy.log('Loading external models test data');
    return cy
      .fixture('e2e/modelsAsService/testExternalModels.yaml', 'utf8')
      .then((yamlContent: string) => {
        const fixtureData = yaml.load(yamlContent) as {
          projectResourceName: string;
          emptyProjectResourceName: string;
          resourceName: string;
        };
        projectWithModels = `${fixtureData.projectResourceName}-${uuid}`;
        emptyProject = `${fixtureData.emptyProjectResourceName}-${uuid}`;
        resourceName = `${fixtureData.resourceName}-${uuid}`;

        ensureAdminOcSession();
        cleanupExternalModelsResources(projectWithModels, resourceName);
        createCleanProject(projectWithModels);
        createCleanProject(emptyProject);
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log(
          `Grant ${LDAP_CONTRIBUTOR_USER.USERNAME} edit access to both projects for namespace selector`,
        );
        return addUserToProject(projectWithModels, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit').then(
          () => addUserToProject(emptyProject, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit'),
        );
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log(`Create Secret, ExternalProvider, ExternalModel, and MaaSModelRef: ${resourceName}`);
        createExternalProviderSecret(projectWithModels, resourceName);
        createExternalProvider(projectWithModels, resourceName);
        createExternalModel(projectWithModels, resourceName);
        createMaaSModelRefForExternalModel(projectWithModels, resourceName);
        waitForExternalModelGovernancePending(projectWithModels, resourceName);
      });
  });

  after(() => {
    ensureAdminOcSession();
    cy.log(`Cleaning up external model resources: ${resourceName}`);
    cleanupExternalModelsResources(projectWithModels, resourceName);
    deleteOpenShiftProject(projectWithModels, {
      wait: true,
      ignoreNotFound: true,
      timeout: 300000,
    });
    deleteOpenShiftProject(emptyProject, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'lists external model, shows governance warning, and empty state in another project',
    {
      tags: ['@Dashboard', '@MaaS', '@NonConcurrent', '@FeatureFlagged'],
    },
    () => {
      cy.step('Log into Deployments > External models as a normal user with the flag enabled');
      externalModelsPage.visitAsUser(LDAP_CONTRIBUTOR_USER, {
        enableExternalModelsFlag: true,
        projectName: projectWithModels,
      });

      cy.step('Verify the External models tab and table list the applied model and provider');
      externalModelsPage.findExternalModelsTab().should('exist');
      externalModelsPage.findPage().should('exist');
      externalModelsPage.findTable().should('exist');

      const row = externalModelsPage.getRow(resourceName);
      row.findName().should('contain.text', resourceName);
      row.findProviderLabel(resourceName).should('exist');
      row.findExpandButton().click();
      row.findExpandedProviderName(resourceName).should('exist');

      cy.step(
        'Verify the pending governance warning next to status (subscription and policy needed)',
      );
      row.findGovernanceWarning().should('exist').click();
      row.findGovernanceWarningPopover().should('exist').and('be.visible');

      cy.step('Switch to a project without external models and verify empty state');
      externalModelsPage.selectProject(emptyProject);
      externalModelsPage.findEmptyState().should('exist');
    },
  );
});
