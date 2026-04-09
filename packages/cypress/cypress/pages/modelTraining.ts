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
        name: 'Jobs',
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
    return appChrome.findNavItem({ name: 'Jobs', rootSection: 'Develop & train' });
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
    this.findProjectMenuItem(projectName).click();
  }

  findProjectMenuItem(projectName: string) {
    return cy.findByRole('menuitem', { name: projectName });
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

  findTypeColumn() {
    return this.findRows().find('[data-label="Type"]');
  }

  findEmptyResults() {
    return this.findTable().find('[data-testid="no-result-found-title"]');
  }

  filterByName(name: string) {
    this.findToolbar().findByLabelText('Filter by name').clear().type(name);
    return this;
  }

  clearNameFilter() {
    this.findToolbar().findByLabelText('Filter by name').clear();
    return this;
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

  findToolbar() {
    return cy.findByTestId('training-job-table-toolbar');
  }

  findFilterTypeDropdownToggle() {
    return cy.findByTestId('training-job-table-toolbar-dropdown');
  }

  selectFilterType(filterType: string) {
    this.findFilterTypeDropdownToggle().click();
    cy.findByRole('menuitem', { name: filterType }).click();
  }

  findTypeFilterSelectToggle() {
    return cy.findByTestId('training-job-type-filter-select');
  }

  selectJobTypeFilter(jobType: string) {
    this.selectFilterType('Type');
    this.findTypeFilterSelectToggle().should('be.visible').click();
    cy.findByRole('option', { name: jobType }).click();
  }

  findTypeFilterChip() {
    return cy.findByTestId('Type-filter-chip');
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
    return this.find()
      .find('[data-label="Status"]')
      .find('[data-testid="training-job-status"],[data-testid="ray-job-status"]');
  }

  findStatusLoading() {
    return this.find().find('[data-label="Status"]').findByTestId('ray-job-status-loading');
  }

  findStatusProgressBar() {
    return this.find().find('[data-label="Status"]').findByTestId('training-job-progress-bar');
  }

  findNameLink() {
    return this.findTrainingJobName().find('button');
  }

  findType() {
    return this.find().find('[data-label="Type"]');
  }

  findRayCluster() {
    return this.find().find('[data-label="Ray cluster"]');
  }

  findPauseResumeToggle() {
    return this.find().findByTestId('state-action-toggle');
  }

  findStatusCell() {
    return this.find().find('[data-label="Status"]');
  }

  findKebabButton() {
    return this.find().findByLabelText('Kebab toggle');
  }

  findEditNodeCountButton() {
    return this.find().find('[data-label="Nodes"]').findByTestId('edit-node-count-button');
  }

  findKebabMenuItem(itemName: string) {
    return cy.findByRole('menuitem', { name: itemName });
  }
}

class ScaleRayJobNodesModal {
  find() {
    return cy.findByTestId('edit-ray-job-node-count-modal');
  }

  shouldBeOpen() {
    this.find().should('exist');
    return this;
  }

  shouldBeClosed() {
    cy.findByTestId('edit-ray-job-node-count-modal').should('not.exist');
    return this;
  }

  findTitle() {
    return this.find().findByRole('heading', { name: 'Edit node count' });
  }

  findHeadNodeInput() {
    return this.find().findByTestId('head-node-count-input');
  }

  findWorkerGroupInput(groupName: string) {
    return this.find().findByTestId(`worker-group-input-${groupName}`);
  }

  findWorkerGroupMinusButton(groupName: string) {
    return this.find().findByLabelText(`Decrease ${groupName} node count`);
  }

  findWorkerGroupPlusButton(groupName: string) {
    return this.find().findByLabelText(`Increase ${groupName} node count`);
  }

  findSaveButton() {
    return this.find().findByRole('button', { name: 'Save' });
  }

  findCancelButton() {
    return this.find().findByRole('button', { name: 'Cancel' });
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

  findEditNodeCountAction() {
    return cy.findByTestId('edit-node-count-action');
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

  findEventLogEntries() {
    return this.findEventLogs().find('li');
  }

  findLogEntry(text: string) {
    return this.findEventLogs().find('li span').contains(text);
  }

  findRetryButton() {
    return cy.findByTestId('retry-job-button');
  }

  findResumeJobButton() {
    return cy.findByTestId('resume-job-button');
  }

  findPauseJobButton() {
    return cy.findByTestId('pause-job-button');
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

  findPlusButton() {
    return this.find().find('button[aria-label="Plus"]');
  }

  findMinusButton() {
    return this.find().find('button[aria-label="Minus"]');
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

class PauseRayJobModal extends Modal {
  constructor() {
    super('Pause RayJob?');
  }

  find() {
    return cy.findByTestId('pause-ray-job-modal');
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

  findPauseButton() {
    return cy.findByTestId('pause-ray-job-button');
  }

  findCancelButton() {
    return cy.findByTestId('cancel-pause-ray-job-button');
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

class RayJobStatusModal {
  find() {
    return cy.findByTestId('ray-job-status-modal');
  }

  shouldBeOpen(open = true) {
    if (open) {
      this.find().should('be.visible');
    } else {
      cy.findByTestId('ray-job-status-modal').should('not.exist');
    }
    return this;
  }

  findHeader() {
    return this.find().findByTestId('generic-modal-header');
  }

  findTitle() {
    return this.findHeader().contains('Ray job progress');
  }

  findStatusLabel() {
    return this.findHeader().findByTestId('ray-job-status');
  }

  getRayJobStatus(expectedStatus: string, timeout?: number) {
    return cy
      .get(
        '[data-testid="ray-job-status-modal"] [data-testid="ray-job-status"]',
        timeout !== undefined ? { timeout } : {},
      )
      .should('contain.text', expectedStatus);
  }

  findAlert(variant: 'danger' | 'warning' | 'info') {
    return cy.findByTestId(`ray-job-status-alert-${variant}`);
  }

  findAlertDescription() {
    return cy.findByTestId('ray-job-status-alert-description');
  }

  findPauseJobButton() {
    return cy.findByTestId('pause-job-button');
  }

  findResumeJobButton() {
    return cy.findByTestId('resume-job-button');
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

class RayJobDetailsDrawer {
  find() {
    return cy.findByTestId('ray-job-details-drawer');
  }

  shouldBeOpen() {
    this.find().should('exist');
    return this;
  }

  shouldBeClosed() {
    cy.findByTestId('ray-job-details-drawer').should('not.exist');
    return this;
  }

  findTitle() {
    return this.find().findByTestId('ray-job-drawer-title');
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

class RayJobDetailsTab {
  findJobSummarySection() {
    return cy.findByTestId('job-summary-section');
  }

  findRayVersionValue() {
    return cy.findByTestId('ray-version-value');
  }

  findExecutionsSection() {
    return cy.findByTestId('executions-section');
  }

  findEntrypointCommandValue() {
    return cy.findByTestId('entrypoint-command-value');
  }

  findSubmissionModeValue() {
    return cy.findByTestId('submission-mode-value');
  }

  findManagementSection() {
    return cy.findByTestId('management-section');
  }

  findShutdownPolicyValue() {
    return cy.findByTestId('shutdown-policy-value');
  }

  findClusterNameValue() {
    return cy.findByTestId('cluster-name-value');
  }
}

class RayJobResourcesTab {
  findNodeConfigurationsSection() {
    return cy.findByTestId('node-configurations-section');
  }

  findNodesValue() {
    return cy.findByTestId('nodes-value');
  }

  findNodesEditButton() {
    return cy.findByTestId('nodes-edit-button');
  }

  findProcessesPerNodeValue() {
    return cy.findByTestId('processes-per-node-value');
  }

  findResourcesPerNodeSection() {
    return cy.findByTestId('resources-per-node-section');
  }

  findWorkerGroupTitle(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}-title`);
  }

  findWorkerGroupCpuRequests(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}-cpu-requests`);
  }

  findWorkerGroupCpuLimits(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}-cpu-limits`);
  }

  findWorkerGroupMemoryRequests(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}-memory-requests`);
  }

  findWorkerGroupMemoryLimits(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}-memory-limits`);
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
}

class RayJobPodsTab {
  findSubmitterPodSection() {
    return cy.findByTestId('submitter-pod-section');
  }

  findRayClusterPodsSection() {
    return cy.findByTestId('ray-cluster-pods-section');
  }

  findWorkerGroup(groupName: string) {
    return cy.findByTestId(`worker-group-${groupName}`);
  }

  findWorkerGroupName(groupName: string) {
    return cy.findByTestId(`worker-group-name-${groupName}`);
  }

  findWorkerPod(podName: string) {
    return cy.findByTestId(`worker-pod-${podName}`);
  }
}

class RayJobLogsTab {
  findJobId() {
    return cy.findByTestId('logs-job-id');
  }

  findDownloadButton() {
    return cy.findByTestId('logs-download-button');
  }

  findEmptyState() {
    return cy.findByTestId('logs-empty-state');
  }

  findWaitingState() {
    return cy.findByTestId('logs-waiting-state');
  }

  findLogViewer() {
    return cy.findByTestId('logs-log-viewer');
  }
}

export const modelTrainingGlobal = new ModelTrainingGlobal();
export const trainingJobTable = new TrainingJobTable();
export const trainingJobDetailsDrawer = new TrainingJobDetailsDrawer();
export const rayJobDetailsDrawer = new RayJobDetailsDrawer();
export const trainingJobResourcesTab = new TrainingJobResourcesTab();
export const trainingJobPodsTab = new TrainingJobPodsTab();
export const trainingJobLogsTab = new TrainingJobLogsTab();
export const trainingJobStatusModal = new TrainingJobStatusModal();
export const scaleNodesModal = new ScaleNodesModal();
export const pauseTrainingJobModal = new PauseTrainingJobModal();
export const pauseRayJobModal = new PauseRayJobModal();
export const trainingJobDetailsTab = new TrainingJobDetailsTab();
export const rayJobDetailsTab = new RayJobDetailsTab();
export const rayJobResourcesTab = new RayJobResourcesTab();
export const editRayJobNodeCountModal = new ScaleRayJobNodesModal();
export const rayJobPodsTab = new RayJobPodsTab();
export const rayJobLogsTab = new RayJobLogsTab();
export const rayJobStatusModal = new RayJobStatusModal();
