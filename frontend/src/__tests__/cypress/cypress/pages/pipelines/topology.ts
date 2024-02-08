import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

class Topology {
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
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`).parent());
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
  findRightDrawerLogsTab() {
    return this.find().findByTestId('right-drawer-tab-logs');
  }

  findRightDrawerDetailItem(key: string) {
    return new DetailsItem(() => this.find().findByTestId(`detail-item-${key}`).parent());
  }
}

class RunDetails extends Topology {
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

class DetailsItem extends Contextual<HTMLDivElement> {
  findValue() {
    return this.find().findByTestId('detail-item-value');
  }
}

class PipelineDetails extends Topology {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipeline/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
  }
}

class PipelineRunJobDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/pipelineRunJob/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
  }
}

class PipelineRunDetails extends RunDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelineRuns/${namespace}/pipelineRun/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
    cy.testA11y();
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
    this.findStepSelect().click().findByText(name).click();
  }
}

export const pipelineDetails = new PipelineDetails();
export const pipelineRunDetails = new PipelineRunDetails();
export const pipelineRunJobDetails = new PipelineRunJobDetails();
