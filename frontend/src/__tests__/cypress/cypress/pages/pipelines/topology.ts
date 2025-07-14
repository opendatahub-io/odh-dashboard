import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { DashboardCodeEditor } from '#~/__tests__/cypress/cypress/pages/components/DashboardCodeEditor';
import type {
  PipelineKF,
  PipelineRecurringRunKF,
  PipelineVersionKF,
} from '#~/concepts/pipelines/kfTypes';
import { SearchSelector } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

class TaskDrawer extends Contextual<HTMLElement> {
  private findTaskDrawer() {
    return this.find().findByTestId('task-drawer');
  }

  findInputArtifacts() {
    return this.findTaskDrawer().findByTestId('Input-artifacts');
  }

  findCommandCodeBlock() {
    return this.findTaskDrawer().findByTestId('command-task-detail-code-block').findByRole('code');
  }

  findTaskImage() {
    return this.findTaskDrawer().findByTestId('task-detail-image');
  }

  findArgumentCodeBlock() {
    return this.findTaskDrawer()
      .findByTestId('arguments-task-detail-code-block')
      .findByRole('code');
  }

  findOutputArtifacts() {
    return this.findTaskDrawer().findByTestId('Output-artifacts');
  }

  findOutputParameters() {
    return this.findTaskDrawer().findByTestId('Output-parameters');
  }

  findCloseDrawerButton() {
    return this.find().findByRole('button', { name: 'Close drawer panel' });
  }

  shouldHaveTaskName(name: string) {
    return this.find().findByTestId('pipeline-task-name').should('have.text', name);
  }
}

class PipelinesTopology {
  visit(namespace: string, pipelineId: string, pipelineVersionId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/${pipelineId}/${pipelineVersionId}/view`);
    this.wait();
  }

  protected wait() {
    cy.testA11y();
  }

  findTaskNode(name: string) {
    return cy.get(`[data-id="${name}"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]`);
  }

  findArtifactNode(name: string) {
    return cy.get(
      `[data-id="GROUP.root.ARTIFACT.${name}"][data-kind="node"][data-type="ICON_TASK_NODE"]`,
    );
  }
}

class PipelineRunRightDrawer extends Contextual<HTMLDivElement> {
  findRightDrawerInputOutputTab() {
    return this.find().findByTestId('right-drawer-tab-inputoutput');
  }

  findRightDrawerDetailsTab() {
    return this.find().findByTestId('right-drawer-tab-details');
  }

  findRightDrawerVolumesTab() {
    return this.find().findByTestId('right-drawer-tab-volumes');
  }

  findRightDrawerVolumesSection() {
    return this.find().find('#volumes');
  }

  findRightDrawerLogsTab() {
    return this.find().findByTestId('right-drawer-tab-logs');
  }

  findRightDrawerDetailItem(key: string) {
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`));
  }
}

class ArtifactRightDrawer extends Contextual<HTMLDivElement> {
  findArtifactTitle() {
    return this.find().findByTestId('artifact-task-name');
  }

  findArtifactType() {
    return this.find().findByTestId('artifact-type');
  }

  findVisualizationTab() {
    return this.find().findByRole('tab', { name: 'Visualization' });
  }

  findIframeContent() {
    return this.find().findByTestId('artifact-visualization').its('0.contentDocument').its('body');
  }
}

class RunDetails extends PipelinesTopology {
  findGraphTab() {
    return cy.findByTestId('pipeline-run-tab-graph');
  }

  findInputParameterTab() {
    return cy.findByTestId('pipeline-run-tab-parameters');
  }

  findDetailsTab() {
    return cy.findByTestId('pipeline-run-tab-details');
  }

  findPipelineSpecTab() {
    return cy.findByTestId('pipeline-run-tab-spec');
  }

  findDetailItem(key: string) {
    return new DetailsItem(() => cy.findByTestId(`detail-item-${key}`));
  }

  private findStatusLabel(timeout?: number) {
    return cy.findByTestId('status-icon', { timeout });
  }

  expectStatusLabelToBe(statusValue: string, timeout?: number) {
    this.findStatusLabel(timeout).should('have.text', statusValue);
  }

  findRightDrawer() {
    return new PipelineRunRightDrawer(() =>
      cy.findByTestId('pipeline-run-drawer-right-content').parent(),
    );
  }

  findArtifactRightDrawer() {
    return new ArtifactRightDrawer(() =>
      cy.findByTestId('pipeline-run-drawer-right-content').parent(),
    );
  }
}

class DetailsItem extends Contextual<HTMLElement> {
  findValue() {
    return this.find().findByTestId('detail-item-value');
  }

  shouldHaveCodeEditorValue(name: string) {
    this.findValue().find('section').contains(name);
    return this;
  }
}

class PipelineDetails extends PipelinesTopology {
  pipelineVersionSelector = new SearchSelector('pipeline-version-selector');

  visit(namespace: string, pipelineId: string, pipelineVersionId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/${pipelineId}/${pipelineVersionId}/view`);
    this.wait();
  }

  selectPipelineVersionByName(name: string): void {
    this.pipelineVersionSelector
      .findToggleButton()
      .click()
      .document()
      .findByTestId('pipeline-version-selector-table-list')
      .find('td')
      .contains(name)
      .click();
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link-in-breadcrumb');
  }

  findYamlTab() {
    return cy.findByTestId('pipeline-yaml-tab');
  }

  getPipelineDashboardCodeEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('pipeline-dashboard-code-editor'));
  }

  findPageTitle(timeout?: number) {
    return cy.findByTestId('app-page-title', { timeout });
  }

  getTaskDrawer() {
    return new TaskDrawer(() => cy.findByTestId('pipeline-topology-drawer'));
  }

  private findActionsDropdown() {
    return cy.findByTestId('pipeline-version-details-actions');
  }

  findRunTaskRightDrawer() {
    return cy.findByTestId('pipeline-run-drawer-right-content');
  }

  findLogsSuccessAlert() {
    return cy.findByTestId('logs-success-alert');
  }

  findLogs() {
    return cy.findByTestId('logs');
  }

  findDownloadStepsToggle() {
    return cy.findByTestId('download-steps-toggle');
  }

  findCurrentStepLogs() {
    return cy.findByTestId('download-current-step-logs');
  }

  findLogsKebabToggle() {
    return cy.findByTestId('logs-kebab-toggle');
  }

  findRawLogs() {
    return cy.findAllByTestId('raw-logs');
  }

  selectActionDropdownItem(label: string) {
    this.findActionsDropdown().click();
    cy.findByRole('menuitem', { name: label }).click();
  }

  mockGetPipeline(namespace: string, pipeline: PipelineKF): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
      { path: { namespace, serviceName: 'dspa', pipelineId: pipeline.pipeline_id } },
      pipeline,
    );
  }

  mockGetPipelineVersion(pipelineId: string, version: PipelineVersionKF, namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
      {
        path: {
          namespace,
          pipelineId,
          serviceName: 'dspa',
          pipelineVersionId: version.pipeline_version_id,
        },
      },
      version,
    );
  }
}

class PipelineRecurringRunDetails extends RunDetails {
  visit(namespace: string, recurringRunId = '') {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/schedules/${recurringRunId}`);
    this.wait();
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link-in-breadcrumb');
  }

  findActionsDropdown() {
    return cy.findByTestId('pipeline-recurring-run-details-actions');
  }

  selectActionDropdownItem(label: string) {
    this.findActionsDropdown().click();
    cy.findByRole('menuitem', { name: label }).click();
  }

  mockEnableRecurringRun(recurringRun: PipelineRecurringRunKF, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId:mode',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          recurringRunId: recurringRun.recurring_run_id,
          mode: ':enable',
        },
      },
      { data: {} },
    );
  }

  mockDisableRecurringRun(recurringRun: PipelineRecurringRunKF, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId:mode',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          recurringRunId: recurringRun.recurring_run_id,
          mode: ':disable',
        },
      },
      { data: {} },
    );
  }
}

class PipelineRunDetails extends RunDetails {
  visit(namespace: string, runId = '') {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/runs/${runId}`);
    this.wait();
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link-in-breadcrumb');
  }

  findActionsDropdown() {
    return cy.findByTestId('pipeline-run-details-actions');
  }

  findRunTaskRightDrawer() {
    return cy.findByTestId('pipeline-run-drawer-right-content');
  }

  findLogsSuccessAlert() {
    return cy.findByTestId('logs-success-alert');
  }

  findLogsCachedAlert() {
    return cy.findByTestId('logs-cached-alert');
  }

  findLogs() {
    return cy.findByTestId('logs');
  }

  findDownloadStepsToggle() {
    return cy.findByTestId('download-steps-toggle');
  }

  findCurrentStepLogs() {
    return cy.findByTestId('download-current-step-logs');
  }

  findLogsKebabToggle() {
    return cy.findByTestId('logs-kebab-toggle');
  }

  findRawLogs() {
    return cy.findAllByTestId('raw-logs');
  }

  findStepSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('logs-step-select');
  }

  findLogsPauseButton() {
    return cy.findByTestId('logs-pause-refresh-button');
  }

  selectStepByName(name: string): void {
    this.findStepSelect().findDropdownItem(name).click();
  }

  selectActionDropdownItem(label: string) {
    this.findActionsDropdown().click();
    cy.findByRole('menuitem', { name: label }).click();
  }

  findYamlOutput() {
    return cy.findByTestId('pipeline-dashboard-code-editor');
  }

  findInputArtifacts() {
    return cy.findByTestId('Input-artifacts');
  }

  findOutputArtifacts() {
    return cy.findByTestId('Output-artifacts');
  }

  findArtifactItems(itemId: string) {
    return cy.findByTestId(`${itemId}-item`);
  }

  findErrorState(id: string) {
    return cy.findByTestId(id);
  }
}

export const pipelineDetails = new PipelineDetails();
export const pipelineRunDetails = new PipelineRunDetails();
export const pipelineRecurringRunDetails = new PipelineRecurringRunDetails();
export const pipelinesTopology = new PipelinesTopology();
