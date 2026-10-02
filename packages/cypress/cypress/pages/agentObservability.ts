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
    cy.findByTestId('app-page-title').should('exist');
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
}

export const agentObservability = new AgentObservability();
