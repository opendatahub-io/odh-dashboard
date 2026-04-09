import { appChrome } from './appChrome';

class McpCatalogPage {
  navigate() {
    appChrome.findNavItem({ name: 'MCP servers', rootSection: 'AI hub' }).click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title').should('exist');
    cy.testA11y();
  }

  findMcpCatalogCards() {
    return cy.findAllByTestId(/^mcp-catalog-card-\d+$/);
  }

  findCardDetailsLink(serverId: string) {
    return cy.findByTestId(`mcp-catalog-card-detail-link-${serverId}`);
  }

  findPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }
}

class McpServerDetailsPage {
  findDeployButton() {
    return cy.findByTestId('mcp-deploy-button');
  }

  clickDeployButtonWithRetry() {
    const maxRetries = 3;
    let attempt = 0;
    const tryClick = () => {
      attempt++;
      cy.log(`Deploy button click attempt #${attempt}`);
      this.findDeployButton().click();
      // cy.location() is an async Cypress command that acts as a queue spacer,
      // giving extension-loaded modals time to render before the DOM check
      cy.location('pathname').then(() => {
        if (Cypress.$('[data-testid="mcp-deploy-modal"]').length === 0 && attempt < maxRetries) {
          cy.log('Deploy modal did not open, retrying...');
          tryClick();
        }
      });
    };
    tryClick();
  }
}

class McpDeployModal {
  find() {
    return cy.findByTestId('mcp-deploy-modal');
  }

  findNameInput() {
    return cy.findByTestId('mcp-deploy-name');
  }

  findProjectSelectorToggle() {
    return cy.findByTestId('project-selector-toggle');
  }

  findProjectSelectorOption(name: string) {
    return cy.findByTestId('project-selector-menuList').findByRole('menuitem', { name });
  }

  findOciImageInput() {
    return cy.findByTestId('mcp-deploy-oci-image-input');
  }

  findSubmitButton() {
    return cy.findByTestId('mcp-deploy-submit-button');
  }
}

class McpDeploymentsPage {
  findProjectSelectorToggle() {
    return cy.findByTestId('project-selector-toggle');
  }

  findProjectSelectorOption(name: string) {
    return cy.findByTestId('project-selector-menuList').findByRole('menuitem', { name });
  }

  selectProject(name: string) {
    cy.location('pathname').should('include', 'mcp-servers/deployments');
    this.findProjectSelectorToggle().click();
    this.findProjectSelectorOption(name).click();
  }

  findTable() {
    return cy.findByTestId('mcp-deployments-table');
  }

  findDeploymentByName(name: string) {
    return cy.findByTestId(`mcp-deployment-row-${name}`, { timeout: 30000 });
  }

  findDeploymentStatusLabelByName(name: string) {
    return this.findDeploymentByName(name).findByTestId('mcp-deployment-status-label');
  }
}

export const mcpCatalogPage = new McpCatalogPage();
export const mcpServerDetailsPage = new McpServerDetailsPage();
export const mcpDeployModal = new McpDeployModal();
export const mcpDeploymentsPage = new McpDeploymentsPage();
