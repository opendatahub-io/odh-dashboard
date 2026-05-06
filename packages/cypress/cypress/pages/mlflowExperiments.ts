import { appChrome } from './appChrome';

export enum ExperimentTypeToggle {
  GEN_AI = 'GenAI',
  MODEL_TRAINING = 'Model training',
}

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';
const EXPERIMENTS_PATH = '/develop-train/mlflow/experiments';

class MlflowExperiments {
  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`${EXPERIMENTS_PATH}${qs}`);
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title', { timeout: 30000 }).should('exist');
    cy.testA11y();
  }

  waitForEmbeddedContent() {
    this.findExperimentsSearchInput().should('be.visible');
  }

  shouldHaveExperimentsUrl() {
    cy.url().should('include', EXPERIMENTS_PATH).should('include', 'workspace=');
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url().should('include', `workspace=${workspace}`);
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Experiments',
      rootSection: 'Develop & train',
    });
  }

  findNavSection() {
    return appChrome.findNavSection('Develop & train');
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findLaunchMlflowButton() {
    return cy.findByTestId('mlflow-embedded-jump-link', { timeout: 10000 });
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findErrorEmptyState() {
    return cy.findByTestId('empty-state-title', { timeout: 10000 });
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle', { timeout: 30000 });
  }

  findProjectInDropdown(name: string) {
    return cy.findByRole('menuitem', { name });
  }

  findBreadcrumb() {
    return cy.findByRole('navigation', { name: 'Breadcrumb' });
  }

  findBreadcrumbItem(label: string) {
    return this.findBreadcrumb().contains(label);
  }

  findExperimentTypeToggleItem(label: string) {
    return cy.contains('[role="button"][aria-pressed]', label);
  }

  shouldHaveExperimentTypeSelected(label: string) {
    this.findExperimentTypeToggleItem(label).should('have.attr', 'aria-pressed', 'true');
  }

  findUsageTab() {
    return cy.findByRole('tab', { name: 'Usage' });
  }

  findQualityTab() {
    return cy.findByRole('tab', { name: 'Quality' });
  }

  findToolCallsTab() {
    return cy.findByRole('tab', { name: 'Tool calls' });
  }

  shouldHaveUsageTabSelected() {
    this.findUsageTab().should('have.attr', 'aria-selected', 'true');
  }

  findEvaluationRunsLink() {
    return cy.findByRole('link', { name: 'Evaluation runs' });
  }

  findExperimentsSearchInput() {
    return cy.findByTestId('search-experiment-input', { timeout: 30000 });
  }

  findCreateExperimentButton() {
    return cy.findByTestId('create-experiment-table-empty-state-button', { timeout: 30000 });
  }

  findExperimentInTable(name: string) {
    return cy.findByRole('link', { name });
  }

  findCreateExperimentModal() {
    return cy.findByTestId('mlflow-input-modal');
  }

  findExperimentNameInput() {
    return this.findCreateExperimentModal().find('input').first();
  }

  findCreateDialogSubmitButton() {
    return this.findCreateExperimentModal().findByRole('button', { name: 'Create' });
  }

  findExperimentDetailHeading(name: string) {
    return cy.findByRole('heading', { name, timeout: 10000 });
  }

  findOverflowMenuTrigger() {
    return cy.findByTestId('overflow-menu-trigger');
  }

  findRenameAction() {
    return cy.findByTestId('rename');
  }

  findDeleteAction() {
    return cy.findByTestId('delete');
  }

  findRenameInput() {
    return this.findCreateExperimentModal().find('input').first();
  }

  findRenameSubmitButton() {
    return this.findCreateExperimentModal().findByRole('button', { name: 'Save' });
  }

  findDeleteConfirmModal() {
    return cy.findByTestId('confirm-modal');
  }

  findDeleteConfirmButton() {
    return this.findDeleteConfirmModal().findByRole('button', { name: 'Delete' });
  }

  shouldHaveRunsTable() {
    cy.findByTestId('sort-header-Run Name', { timeout: 10000 }).should('exist');
  }

  findRunInTable(runName: string) {
    return cy.contains('[role="row"]', runName);
  }

  findRunCheckbox(runName: string) {
    return this.findRunInTable(runName).find('[role="checkbox"], input[type="checkbox"]').first();
  }

  findCompareButton() {
    return cy.findByRole('button', { name: /compare/i });
  }

  findCompareRunsHeading() {
    return cy.contains('Comparing');
  }

  findCompareRunsVisualizations() {
    return cy.contains('Visualizations');
  }

  findCompareRunDetails() {
    return cy.contains('Run details');
  }

  shouldContainText(text: string) {
    cy.contains(text).should('be.visible');
  }

  findRunParameters() {
    return cy.contains('Parameters', { timeout: 10000 });
  }

  findRunMetrics() {
    return cy.contains('Metrics', { timeout: 10000 });
  }

  getMlflowDarkModeStorageValue(): Cypress.Chainable<string | null> {
    return cy.window().then((win) => {
      const value = win.localStorage.getItem(MLFLOW_DARK_MODE_KEY);
      return cy.wrap<string | null>(value);
    });
  }
}

export const mlflowExperiments = new MlflowExperiments();
