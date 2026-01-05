import { TableRow } from './components/table';
import { Modal } from './components/Modal';
import { appChrome } from './appChrome';

class ModelTrainingGlobal {
  visit(projectName?: string, wait = true) {
    const url = projectName
      ? `/develop-train/training-jobs/${projectName}`
      : '/develop-train/training-jobs';
    cy.visitWithLogin(url);
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    // Wait for the sidebar to be visible and ready
    appChrome.findSideBar().should('be.visible');
    appChrome.findMainContent().should('be.visible');

    appChrome
      .findNavItem({
        name: 'Training jobs',
        rootSection: 'Develop & train',
      })
      .click();

    this.wait();
  }

  private wait() {
    this.findAppPage();
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Training jobs', rootSection: 'Develop & train' });
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  findAppPage() {
    return cy.findByTestId('app-page-title');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-dropdown');
  }

  findProjectSelectorToggle() {
    return cy.findByTestId('project-selector-toggle');
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
  findTable() {
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

  findEmptyState() {
    return cy.findByTestId('empty-state-body');
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
    // Find the status label by testid (the clickable Label component)
    // The entire Label is clickable, not just the icon
    return this.find().find('[data-label="Status"]').findByTestId('training-job-status');
  }

  findStatusProgressBar() {
    return this.find().find('[data-label="Status"]').findByTestId('training-job-progress-bar');
  }

  findNameLink() {
    return this.findTrainingJobName().find('button');
  }

  findPauseResumeToggle() {
    return this.find().findByTestId('state-action-toggle');
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

class TrainingJobPodsTab {
  findInitializersSection() {
    return cy.findByRole('button', { name: /Initializers/ });
  }

  findTrainingPodsSection() {
    return cy.findByText('Training pods');
  }

  findPodByName(podName: string) {
    return cy.findByRole('button', { name: podName });
  }

  findPodList() {
    return cy.findAllByRole('button').filter((_, el) => {
      const text = Cypress.$(el).text();
      return text.includes('-pod-') || text.includes('pod');
    });
  }

  findNoPods() {
    return cy.findByText('No pods found');
  }

  findNoInitializers() {
    return cy.findByText('No initializers found');
  }

  expandInitializers() {
    this.findInitializersSection().click();
  }
}
class TrainingJobStatusModal extends Modal {
  constructor() {
    super('Training Job Status');
  }

  find() {
    return cy.findByTestId('training-job-status-modal');
  }

  getModal() {
    return this.find();
  }

  shouldBeOpen(open = true) {
    if (open) {
      this.find().should('be.visible');
    } else {
      this.find().should('not.exist');
    }
    return this;
  }

  findHeader() {
    return cy.findByTestId('training-job-status-modal-header');
  }

  findTitle() {
    return this.findHeader().contains('Training job status');
  }

  findStatusLabel() {
    return this.findHeader().findByTestId('training-job-status');
  }

  getTrainingJobStatus(expectedStatus: string, timeout?: number) {
    // Scope the search to within the modal to avoid finding status in table rows
    // Use cy.get with scoped selector within the modal
    return cy
      .get(
        '[data-testid="training-job-status-modal"] [data-testid="training-job-status"]',
        // Only pass timeout if it's explicitly provided
        timeout !== undefined ? { timeout } : {},
      )
      .should('contain.text', expectedStatus);
  }

  findProgressTab() {
    return cy.findByTestId('expand-progress');
  }

  findEventsLogTab() {
    return cy.findByTestId('expand-logs');
  }

  selectTab(tabName: 'Progress' | 'Events log') {
    if (tabName === 'Progress') {
      this.findProgressTab().click();
    } else {
      this.findEventsLogTab().click();
    }
    return this;
  }

  findInitializationSection() {
    return cy.findByTestId('initialization-section');
  }

  findDataInitializerSection() {
    return cy.findByTestId('data-initializer-section');
  }

  findModelInitializerSection() {
    return cy.findByTestId('model-initializer-section');
  }

  findTrainingSection() {
    return cy.findByTestId('training-section');
  }

  findEventLogs() {
    return cy.findByTestId('event-logs');
  }

  findLogEntry(text: string) {
    return this.findEventLogs().find('li span').contains(text);
  }

  findRetryButton() {
    return cy.findByTestId('retry-job-button');
  }

  findPauseResumeButton() {
    return cy.findByTestId('pause-resume-job-button');
  }

  findDeleteButton() {
    return cy.findByTestId('delete-job-button');
  }

  findCloseButton() {
    return cy.findByTestId('close-status-modal-button');
  }

  close() {
    this.findCloseButton().click();
    return this;
  }
}

class TrainingJobLogsTab {
  findPodSelector() {
    // Find the pod selector dropdown - it may show "Select pod..." or a pod name
    return cy.findByTestId('logs-pod-selector');
  }

  findPodDropdown() {
    return cy.findByRole('menu');
  }

  selectPod(podName: string) {
    this.findPodSelector().click();
    cy.findByRole('menuitem', { name: podName }).click();
    return this;
  }

  findDownloadButton() {
    return cy.findByRole('button', { name: /Download/ });
  }

  findLogViewer() {
    return cy.get('.pf-v6-c-log-viewer');
  }

  findLogContent() {
    return cy.get('.pf-v6-c-log-viewer__text');
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findErrorState() {
    return cy.findByText(/Failed to load logs/);
  }

  findLoadingSpinner() {
    return cy.get('.pf-v6-c-spinner');
  }
}

class ScaleNodesModal extends Modal {
  constructor() {
    super('Edit node count');
  }

  find() {
    return cy.findByTestId('scale-nodes-modal');
  }

  shouldBeOpen(open = true) {
    if (open) {
      this.find().should('be.visible');
    } else {
      this.find().should('not.exist');
    }
    return this;
  }

  findNodeCountInput() {
    return cy.findByTestId('node-count-input');
  }

  setNodeCount(count: number) {
    this.findNodeCountInput().clear();
    this.findNodeCountInput().type(count.toString());
    return this;
  }

  findSaveButton() {
    return cy.findByRole('button', { name: 'Save' });
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  findErrorMessage() {
    return cy.get('.pf-v6-c-helper-text__item-text');
  }

  save() {
    this.findSaveButton().click();
    return this;
  }

  cancel() {
    this.findCancelButton().click();
    return this;
  }
}
class PauseTrainingJobModal extends Modal {
  constructor() {
    super('Pause training job?');
  }

  find() {
    return cy.findByTestId('pause-training-job-modal');
  }

  shouldBeOpen(open = true) {
    if (open) {
      this.find().should('be.visible');
    } else {
      this.find().should('not.exist');
    }
    return this;
  }

  findDontShowAgainCheckbox() {
    return cy.findByTestId('dont-show-again-checkbox');
  }

  checkDontShowAgain() {
    this.findDontShowAgainCheckbox().click();
    return this;
  }

  findPauseButton() {
    return cy.findByRole('button', { name: 'Pause' });
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  pause() {
    this.findPauseButton().click();
    return this;
  }

  cancel() {
    this.findCancelButton().click();
    return this;
  }
}

class TrainingJobDetailsTab {
  findProgressSection() {
    return cy.findByTestId('progress-section');
  }

  findMetricsSection() {
    return cy.findByTestId('metrics-section');
  }

  findEstimatedTimeRemainingValue() {
    return cy.findByTestId('time-remaining-value');
  }

  findStepsValue() {
    return cy.findByTestId('steps-value');
  }

  findEpochsValue() {
    return cy.findByTestId('epochs-value');
  }

  findLossValue() {
    return cy.findByTestId('metric-loss-value');
  }

  findAccuracyValue() {
    return cy.findByTestId('metric-accuracy-value');
  }

  findTotalBatchesValue() {
    return cy.findByTestId('metric-total_batches-value');
  }

  findTotalSamplesValue() {
    return cy.findByTestId('metric-total_samples-value');
  }
}

export const modelTrainingGlobal = new ModelTrainingGlobal();
export const trainingJobTable = new TrainingJobTable();
export const trainingJobDetailsDrawer = new TrainingJobDetailsDrawer();
export const trainingJobResourcesTab = new TrainingJobResourcesTab();
export const trainingJobPodsTab = new TrainingJobPodsTab();
export const trainingJobLogsTab = new TrainingJobLogsTab();
export const trainingJobStatusModal = new TrainingJobStatusModal();
export const scaleNodesModal = new ScaleNodesModal();
export const pauseTrainingJobModal = new PauseTrainingJobModal();
export const trainingJobDetailsTab = new TrainingJobDetailsTab();
