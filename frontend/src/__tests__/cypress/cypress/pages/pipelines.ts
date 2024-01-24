class PipelineDetails {
  visit(namespace: string, pipelineId: string) {
    cy.visitWithLogin(`/pipelines/${namespace}/pipeline/view/${pipelineId}`);
    this.wait();
  }

  private wait() {
    cy.get('[data-test-id="topology"]');
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

class PipelinesCoreAppPage {
  private testId = 'pipelines-core-app-page';

  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    this.wait();
  }

  private wait() {
    this.find();
    cy.testA11y();
  }

  find() {
    return cy.findByTestId(this.testId);
  }

  findProjectSelect() {
    return this.find().findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export class PipelinesTable {
  private testId = 'pipelines-table';

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  toggleExpandRowByIndex(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByLabelText('Details').eq(index).click();
  }
}

export const pipelineDetails = new PipelineDetails();
export const pipelinesCoreAppPage = new PipelinesCoreAppPage();
export const pipelinesTable = new PipelinesTable();
