/* eslint-disable camelcase */
import { agentsCatalog, agentDetailsPage } from '~/__tests__/cypress/cypress/pages/agentsCatalog';
import { agentsCatalogUrl } from '~/app/routes/agentsCatalog/agentsCatalog';
import { initAgentsCatalogIntercepts } from './agentsCatalogTestUtils';

describe('Agents Catalog Page', () => {
  beforeEach(() => {
    initAgentsCatalogIntercepts();
  });

  it('Agents Catalog tab should be enabled in nav', () => {
    agentsCatalog.visit();
    agentsCatalog.tabEnabled();
  });
});

describe('Agent Details Page', () => {
  beforeEach(() => {
    initAgentsCatalogIntercepts();
  });

  it('should display breadcrumb with link back to catalog', () => {
    agentDetailsPage.visit('my-agent');
    agentDetailsPage.findBreadcrumbCatalogLink().should('be.visible');
  });

  it('should display agent name in breadcrumb', () => {
    agentDetailsPage.visit('my-agent');
    agentDetailsPage.findBreadcrumbAgentName().should('contain', 'my-agent');
  });

  it('breadcrumb link should navigate back to catalog', () => {
    agentDetailsPage.visit('test-agent');
    agentDetailsPage.findBreadcrumbCatalogLink().click();
    agentsCatalog.findPageTitle().should('be.visible');
  });

  it('should redirect from :agentName to :agentName/overview', () => {
    cy.visit(`${agentsCatalogUrl()}/test-agent`);
    cy.url().should('include', `${agentsCatalogUrl()}/test-agent/overview`);
  });
});

describe('Agents Catalog Gallery', () => {
  it('should render agent cards when agents are available', () => {
    initAgentsCatalogIntercepts({ agentsPerCategory: 3 });
    agentsCatalog.visit();
    agentsCatalog.findCards().should('have.length.greaterThan', 0);
  });

  it('should display agent name and description in cards', () => {
    initAgentsCatalogIntercepts({ agentsPerCategory: 2 });
    agentsCatalog.visit();
    agentsCatalog.findCardDetailLink('agent_templates-agent-1').should('be.visible');
    agentsCatalog.findCardDescription('agent_templates-agent-1').should('be.visible');
  });

  it('should navigate to agent details when clicking card link', () => {
    initAgentsCatalogIntercepts({ agentsPerCategory: 1 });
    agentsCatalog.visit();
    agentsCatalog.findCardDetailLink('agent_templates-agent-1').click();
    cy.url().should('include', '/agents-catalog/');
  });

  it('should display labels on agent cards with mapped display names', () => {
    // mockAgent defaults: framework='langgraph', labels=['Web search','General purpose']
    // Card renders cardLabels = [frameworkDisplayName, ...labels] = 3 labels total
    // 'langgraph' maps to 'LangGraph' via AGENT_FRAMEWORK_LABEL_MAPPING
    initAgentsCatalogIntercepts({ agentsPerCategory: 1 });
    agentsCatalog.visit();

    const agentId = 'agent_templates-agent-1';
    agentsCatalog.findCardLabels(agentId).should('have.length', 3);
    agentsCatalog.findCardLabels(agentId).eq(0).should('contain.text', 'LangGraph');
    agentsCatalog.findCardLabels(agentId).eq(1).should('contain.text', 'Web search');
    agentsCatalog.findCardLabels(agentId).eq(2).should('contain.text', 'General purpose');
  });
});

describe('Agents Catalog Empty States', () => {
  it('should show empty state when no sources configured', () => {
    initAgentsCatalogIntercepts({ sources: [], agentsPerCategory: 0 });
    agentsCatalog.visit();
    agentsCatalog.findEmptyState().should('be.visible');
  });
});
