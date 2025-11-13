import { TableRow } from './components/table';

class ModelTrainingGlobal {
  visit(projectName?: string) {
    const baseUrl = projectName
      ? `/develop-train/training-jobs/${projectName}`
      : '/develop-train/training-jobs';
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

  findNodes() {
    return this.find().find('[data-label="Nodes"]');
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

  findNameLink() {
    return this.findTrainingJobName().find('button');
  }
}

class TrainingJobDetailsDrawer {
  find() {
    return cy.findByTestId('training-job-details-drawer');
  }

  shouldBeOpen() {
    this.find().should('exist');
    return this;
  }

  shouldBeClosed() {
    cy.findByTestId('training-job-details-drawer').should('not.exist');
    return this;
  }

  findTitle() {
    return this.find().find('h2');
  }

  findDescription() {
    return this.find().find('p').first();
  }

  findCloseButton() {
    return this.find().findByLabelText('Close drawer panel');
  }

  findKebabMenu() {
    return this.find().findByLabelText('Kebab toggle');
  }

  findTab(tabName: string) {
    return this.find().findByRole('tab', { name: tabName });
  }

  selectTab(tabName: string) {
    this.findTab(tabName).click();
    return this;
  }

  findActiveTabContent() {
    return this.find().find('[role="tabpanel"]');
  }

  close() {
    this.findCloseButton().click();
  }

  clickKebabMenu() {
    this.findKebabMenu().click();
  }

  findKebabMenuItem(itemName: string) {
    return cy.findByRole('menuitem', { name: itemName });
  }
}

class TrainingJobResourcesTab {
  findNodeConfigurationsSection() {
    return cy.findByTestId('node-configurations-section');
  }

  findNodesValue() {
    return cy.findByTestId('nodes-value');
  }

  findProcessesPerNodeValue() {
    return cy.findByTestId('processes-per-node-value');
  }

  findNodesEditButton() {
    return cy.findByTestId('nodes-edit-button');
  }

  findResourcesPerNodeSection() {
    return cy.findByTestId('resources-per-node-section');
  }

  findCpuRequestsValue() {
    return cy.findByTestId('cpu-requests-value');
  }

  findCpuLimitsValue() {
    return cy.findByTestId('cpu-limits-value');
  }

  findMemoryRequestsValue() {
    return cy.findByTestId('memory-requests-value');
  }

  findMemoryLimitsValue() {
    return cy.findByTestId('memory-limits-value');
  }

  findClusterQueueSection() {
    return cy.findByTestId('cluster-queue-section');
  }

  findQueueValue() {
    return cy.findByTestId('queue-value');
  }

  findQuotasSection() {
    return cy.findByTestId('quotas-section');
  }

  findQuotaSourceValue() {
    return cy.findByTestId('quota-source-value');
  }

  findConsumedQuotaValue() {
    return cy.findByTestId('consumed-quota-value');
  }

  findConsumedResourceByLabel(label: string) {
    return this.findConsumedQuotaValue().contains(label).parent().parent();
  }

  findCPUQuotaTotal() {
    return this.findConsumedResourceByLabel('CPU').contains('Total:');
  }

  findCPUQuotaConsumed() {
    return this.findConsumedResourceByLabel('CPU').contains('Consumed:');
  }

  findMemoryQuotaTotal() {
    return this.findConsumedResourceByLabel('Memory').contains('Total:');
  }

  findMemoryQuotaConsumed() {
    return this.findConsumedResourceByLabel('Memory').contains('Consumed:');
  }

  findGPUQuotaTotal() {
    return this.findConsumedResourceByLabel('nvidia.com/gpu').contains('Total:');
  }

  findGPUQuotaConsumed() {
    return this.findConsumedResourceByLabel('nvidia.com/gpu').contains('Consumed:');
  }
}

export const modelTrainingGlobal = new ModelTrainingGlobal();
export const trainingJobTable = new TrainingJobTable();
export const trainingJobDetailsDrawer = new TrainingJobDetailsDrawer();
export const trainingJobResourcesTab = new TrainingJobResourcesTab();
