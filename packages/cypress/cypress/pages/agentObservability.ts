import { appChrome } from './appChrome';
import { SearchSelector } from './components/subComponents/SearchSelector';

const AGENT_OBSERVABILITY_PATH = '/observe-and-monitor/agent-observability';

class AgentObservability {
  projectDropdown = new SearchSelector('project-selector');

  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`${AGENT_OBSERVABILITY_PATH}${qs}`);
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

  shouldHaveAgentObservabilityUrl() {
    cy.url().should('include', AGENT_OBSERVABILITY_PATH).should('include', 'workspace=');
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url()
      .should('include', AGENT_OBSERVABILITY_PATH)
      .should('include', `workspace=${workspace}`);
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Agent observability',
      rootSection: 'Observe & monitor',
    });
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findLaunchMlflowButton() {
    return cy.findByTestId('mlflow-embedded-jump-link');
  }

  findNoProjectsEmptyState() {
    return cy.findByTestId('agent-observability-no-projects-empty-state');
  }

  findErrorEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findNotConfiguredEmptyState() {
    return cy.findByTestId('mlflow-not-configured-empty-state');
  }

  findNotConfiguredAdminEmptyState() {
    return cy.findByTestId('mlflow-not-configured-admin-empty-state');
  }

  findNotConfiguredAdminLink() {
    return cy.findByTestId('mlflow-not-configured-admin-link');
  }

  waitForEmbeddedContent() {
    this.findExperimentsSearchInput().should('be.visible');
  }

  findExperimentsSearchInput() {
    return cy.findByTestId('search-experiment-input', { timeout: 30000 });
  }

  findCreateExperimentButton() {
    return cy.get(
      '[data-testid="create-experiment-table-empty-state-button"], [data-testid="create-experiment-button"]',
      { timeout: 30000 },
    );
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

  findExperimentInTable(name: string) {
    return cy.findByRole('link', { name });
  }

  findExperimentDetailHeading(name: string) {
    return cy.findByRole('heading', { name, timeout: 10000 });
  }

  findExperimentTypeToggleItem(label: string) {
    return cy.contains('[role="button"][aria-pressed]', label);
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

  findBreadcrumb() {
    return cy.findByRole('navigation', { name: 'Breadcrumb' });
  }

  findBreadcrumbItem(label: string) {
    return this.findBreadcrumb().contains(label);
  }
}

export const agentObservability = new AgentObservability();
