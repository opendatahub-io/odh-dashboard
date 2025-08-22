import { TableRow } from './components/table';

class ModelTrainingGlobal {
  visit(projectName?: string) {
    const baseUrl = projectName ? `/modelTraining/${projectName}` : '/modelTraining';
    const url = `${baseUrl}?devFeatureFlags=Model+Training+Plugin%3Dtrue`;
    cy.visitWithLogin(url);
    this.wait();
  }

  private wait() {
    this.findAppPage();
    cy.testA11y();
  }

  findAppPage() {
    return cy.findByTestId('app-page-title');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-dropdown');
  }

  findProjectSelectorToggle() {
    return cy.findByTestId('project-selector-dropdown-toggle');
  }

  selectProject(projectName: string) {
    this.findProjectSelectorToggle().click();
    cy.findByRole('menuitem', { name: projectName }).click();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findEmptyStateDescription() {
    return cy.findByTestId('empty-state-body');
  }

  findTrainingJobTable() {
    return cy.findByTestId('training-job-table');
  }

  findLoadingContent() {
    return cy.findByText('Loading');
  }

  findCancelLoadingButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }
}

class TrainingJobTable {
  private findTable() {
    return cy.findByTestId('training-job-table');
  }

  findColumnHeaderByName(name: string) {
    return this.findTable().findByRole('columnheader', { name });
  }

  getTableRow(name: string) {
    return new TrainingJobTableRow(() =>
      this.findTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  findEmptyResults() {
    return this.findTable().find('[data-testid="no-result-found-title"]');
  }

  shouldHaveTrainingJobs(count: number) {
    this.findRows().should('have.length', count);
    return this;
  }

  shouldBeEmpty() {
    this.findEmptyResults().should('exist');
    return this;
  }
}

class TrainingJobTableRow extends TableRow {
  findTrainingJobName() {
    return this.find().find('[data-label="Name"]');
  }

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  findWorkerNodes() {
    return this.find().find('[data-label="Master/Worker"]');
  }

  findClusterQueue() {
    return this.find().find('[data-label="Cluster queue"]');
  }

  findCreated() {
    return this.find().find('[data-label="Created"]');
  }

  findStatus() {
    return this.find().find('[data-label="Status"]');
  }
}

export const modelTrainingGlobal = new ModelTrainingGlobal();
export const trainingJobTable = new TrainingJobTable();
