import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

class PipelinesTopology {
  visit(namespace: string, pipelineId: string, pipelineVersionId: string) {
    cy.visit(`/pipelines/${namespace}/pipeline/view/${pipelineId}/${pipelineVersionId}`);
    this.wait();
  }

  protected wait() {
    cy.testA11y();
  }

  findTaskNode(name: string) {
    return cy.get(`[data-id="${name}"][data-kind="node"][data-type="DEFAULT_TASK_NODE"]`);
  }

  findTaskDrawer() {
    return cy.findByTestId('task-drawer');
  }

  findCloseDrawerButton() {
    return this.findTaskDrawer().findByRole('button', { name: 'Close drawer panel' });
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
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`).parent());
  }
}

class RunDetails extends PipelinesTopology {
  findBottomDrawer() {
    return new PipelineRunBottomDrawer(() =>
      cy.findByTestId('pipeline-run-drawer-bottom').parent(),
    );
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
    cy.visit(`/pipelines/${namespace}/pipeline/view/${pipelineId}/${pipelineVersionId}`);
    this.wait();
  }

  findActionsDropdown() {
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
    this.findActionsDropdown().click().findByRole('menuitem', { name: label }).click();
  }
}

class PipelineRunJobDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visit(`/pipelineRuns/${namespace}/pipelineRunJob/view/${pipelineId}`);
    this.wait();
  }

  findActionsDropdown() {
    return cy.findByTestId('pipeline-run-job-details-actions');
  }

  selectActionDropdownItem(label: string) {
    this.findActionsDropdown().click().findByRole('menuitem', { name: label }).click();
  }
}

class PipelineRunDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visit(`/pipelineRuns/${namespace}/pipelineRun/view/${pipelineId}`);
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
    this.findActionsDropdown().findDropdownItem(label).click();
  }
}

class PipelineRunBottomDrawer extends Contextual<HTMLDivElement> {
  findBottomDrawerDetailsTab() {
    return this.find().findByTestId('bottom-drawer-tab-details');
  }

  findBottomDrawerYamlTab() {
    return this.find().findByTestId('bottom-drawer-tab-run-output');
  }

  findBottomDrawerInputTab() {
    return this.find().findByTestId('bottom-drawer-tab-input-parameters');
  }

  findBottomDrawerDetailItem(key: string) {
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`));
  }
}

export const pipelineDetails = new PipelineDetails();
export const pipelineRunDetails = new PipelineRunDetails();
export const pipelineRunJobDetails = new PipelineRunJobDetails();
export const pipelinesTopology = new PipelinesTopology();
