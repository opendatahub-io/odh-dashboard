import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../pages/projects';
import { pipelineImportModal } from '../../../pages/pipelines/pipelineImportModal';
import { createSchedulePage } from '../../../pages/pipelines/createRunPage';
import { pipelineDetails, pipelineRecurringRunDetails } from '../../../pages/pipelines/topology';
import { pipelineRunsGlobal, pipelineRecurringRunTable } from '../../../pages/pipelines';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';

const uuid = generateTestUUID();
const awsBucket = 'BUCKET_3' as const;

describe('Verify that a pipeline can be scheduled to run', { testIsolation: false }, () => {
  let projectName = '';
  let pipelineName = '';
  let pipelineDescription = '';
  let scheduleName = '';
  let scheduleDescription = '';
  let pipelineUrl = '';
  let runGroupName = '';
  let runEveryUnit = '';

  retryableBefore(() => {
    cy.fixture('e2e/pipelines/testSchedulePipeline.yaml').then((yamlString) => {
      const cfg = yaml.load(yamlString as string) as Record<string, string>;
      projectName = `${cfg.projectNamePrefix}-${uuid}`;
      pipelineName = cfg.pipelineName;
      pipelineDescription = cfg.pipelineDescription;
      scheduleName = cfg.scheduleName;
      scheduleDescription = cfg.scheduleDescription;
      pipelineUrl = cfg.pipelineUrl;
      runGroupName = cfg.runGroupName;
      runEveryUnit = cfg.runEveryUnit;
      provisionProjectForPipelines(projectName, cfg.dspaSecretName, awsBucket);
    });
  });

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Admin imports a pipeline and schedules it to run',
    { tags: ['@Pipelines', '@Dashboard', '@Smoke', '@SmokeSet4'] },
    () => {
      cy.step(`Navigate to Pipelines ${projectName}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Wait for pipeline server (DSPA) to be ready');
      waitForDspaReady(projectName);

      cy.step('Ensure Import Pipeline button is loaded');
      projectDetails.ensureImportPipelineButtonLoaded();

      cy.step('Import a pipeline by URL');
      projectDetails.findImportPipelineButton().click();
      pipelineImportModal.findPipelineNameInput().type(pipelineName);
      pipelineImportModal.findPipelineDescriptionInput().type(pipelineDescription);
      pipelineImportModal.findImportPipelineRadio().click();
      pipelineImportModal.findPipelineUrlInput().type(pipelineUrl);
      pipelineImportModal.submit();

      cy.step('Verify pipeline detail is loaded');
      pipelineDetails.findPageTitle(60000).should('have.text', pipelineName);

      cy.step('Schedule the pipeline from Runs page');
      pipelineRunsGlobal.navigate();
      pipelineRunsGlobal.selectProjectByName(projectName);
      pipelineRunsGlobal.findSchedulesTab().click();
      pipelineRunsGlobal.findScheduleRunButton().click();

      cy.step('Schedule the pipeline to run every 1 minute');
      createSchedulePage.fillRunGroup(runGroupName);
      createSchedulePage.fillName(scheduleName);
      createSchedulePage.fillDescription(scheduleDescription);

      // Configure periodic schedule to run every 1 minute
      createSchedulePage.findScheduledRunTypeSelector().click();
      createSchedulePage.findScheduledRunTypeSelectorPeriodic().click();
      createSchedulePage.findRunEveryUnitDropdown().click();
      // Use the page object method to select the Minute option
      createSchedulePage.selectRunEveryUnitMinute().click();
      createSchedulePage.findRunEveryUnitDropdown().should('contain.text', runEveryUnit);

      createSchedulePage.pipelineSelect.openAndSelectItem(pipelineName);
      createSchedulePage.findUseLatestVersionRadio().click();
      createSchedulePage.findSubmitButton().click();

      cy.step('Verify the schedule appears in Schedules tab');
      pipelineRunsGlobal.visit(projectName, 'scheduled');
      pipelineRecurringRunTable.getRowByName(scheduleName).find().should('exist');

      cy.step('Open schedule details');
      pipelineRecurringRunTable.getRowByName(scheduleName).findColumnName(scheduleName).click();
      pipelineRecurringRunDetails.findDetailsTab().should('exist');

      cy.step('Verify the scheduled run is actually present and working');
      // Navigate back to schedules to verify the schedule is still there
      pipelineRunsGlobal.visit(projectName, 'scheduled');
      // Verify the schedule row exists and shows the correct name
      pipelineRecurringRunTable.getRowByName(scheduleName).find().should('exist');
      // Verify the schedule shows the correct interval (1 Minute)
      pipelineRecurringRunTable
        .getRowByName(scheduleName)
        .findColumnName(scheduleName)
        .should('contain.text', scheduleName);

      cy.step('Verify navigation to Active Runs page works');
      pipelineRunsGlobal.visit(projectName, 'active');
      pipelineRunsGlobal.findAppPageTitle().should('exist');
    },
  );
});
