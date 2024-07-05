import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';
import { DashboardCodeEditor } from '~/__tests__/cypress/cypress/pages/components/DashboardCodeEditor';

class TaskDrawer extends Contextual<HTMLElement> {
  findInputArtifacts() {
    return this.find().findByTestId('Input-artifacts');
  }

  findCommandCodeBlock() {
    return this.find().findByTestId('command-task-detail-code-block').findByRole('code');
  }

  findTaskImage() {
    return this.find().findByTestId('task-detail-image');
  }

  findArgumentCodeBlock() {
    return this.find().findByTestId('arguments-task-detail-code-block').findByRole('code');
  }

  findOutputArtifacts() {
    return this.find().findByTestId('Output-artifacts');
  }

  findOutputParameters() {
    return this.find().findByTestId('Output-parameters');
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
    cy.visitWithLogin(`/pipelines/${namespace}/pipeline/view/${pipelineId}/${pipelineVersionId}`);
    this.wait();
  }

  protected wait() {
    cy.testA11y();
  }

  findTaskNode(name: string) {
    return cy.get(`[data-id="${name}"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]`);
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

class RunDetails extends PipelinesTopology {
  findGraphTab() {
    return cy.findByTestId('pipeline-run-tab-graph');
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

  findRightDrawer() {
    return new PipelineRunRightDrawer(() =>
      cy.findByTestId('pipeline-run-drawer-right-content').parent(),
    );
  }
}

class DetailsItem extends Contextual<HTMLElement> {
  findValue() {
    return this.find().findByTestId('detail-item-value');
  }
}

class PipelineDetails extends PipelinesTopology {
  visit(namespace: string, pipelineId: string, pipelineVersionId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipeline/view/${pipelineId}/${pipelineVersionId}`);
    this.wait();
  }

  private findPipelineVersionSelect() {
    return cy.findByTestId('pipeline-version-toggle-button');
  }

  selectPipelineVersionByName(name: string): void {
    this.findPipelineVersionSelect()
      .click()
      .parents()
      .findByTestId('pipeline-version-selector-table-list')
      .find('td')
      .contains(name)
      .click();
  }

  findYamlTab() {
    return cy.findByTestId('pipeline-yaml-tab');
  }

  getPipelineDashboardCodeEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('pipeline-dashboard-code-editor'));
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  getTaskDrawer() {
    return new TaskDrawer(() => cy.findByTestId('task-drawer'));
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
}

class PipelineRecurringRunDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipelineRecurringRun/view/${pipelineId}`);
    this.wait();
  }

  findActionsDropdown() {
    return cy.findByTestId('pipeline-recurring-run-details-actions');
  }

  selectActionDropdownItem(label: string) {
    this.findActionsDropdown().click();
    cy.findByRole('menuitem', { name: label }).click();
  }
}

class PipelineRunDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipelineRun/view/${pipelineId}`);
    this.wait();
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
}

export const pipelineDetails = new PipelineDetails();
export const pipelineRunDetails = new PipelineRunDetails();
export const pipelineRecurringRunDetails = new PipelineRecurringRunDetails();
export const pipelinesTopology = new PipelinesTopology();
