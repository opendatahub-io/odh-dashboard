import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import type { RefreshIntervalTitle } from '#~/concepts/metrics/types';
import { SearchSelector } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

class GlobalDistributedWorkloads {
  projectDropdown = new SearchSelector('project-selector');

  visit(wait = true) {
    cy.visitWithLogin(`/distributedWorkloads`);
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Workload metrics', rootSection: 'Observe & monitor' });
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Distributed workloads');
  }

  findRefreshIntervalSelectToggle() {
    return cy.get('#metrics-toolbar-refresh-interval-select-toggle');
  }

  selectRefreshInterval(interval: RefreshIntervalTitle) {
    this.findRefreshIntervalSelectToggle().findSelectOption(interval).click();
  }

  shouldHaveRefreshInterval(interval: RefreshIntervalTitle) {
    this.findRefreshIntervalSelectToggle().should('contain.text', interval);
  }

  findStatusOverviewCard() {
    return cy.findByTestId('dw-status-overview-card');
  }

  findWorkloadResourceMetricsTable() {
    return cy.findByTestId('workload-resource-metrics-table');
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-toggle');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().click();
    cy.findByTestId('project-selector-search').fill(name);
    cy.findByTestId('project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

class ProjectMetricsTab extends GlobalDistributedWorkloads {
  findProjectMetricsButton() {
    return cy.get('button[aria-label="Project metrics tab"]');
  }

  navigateProjectMetricsPage() {
    return this.findProjectMetricsButton().click();
  }

  verifyChartLegend(legendSelector: string, expectedText: string) {
    cy.get(legendSelector).should('have.text', expectedText);
  }

  getRequestedResourcesTooltipText(index: number): Cypress.Chainable<string> {
    return cy
      .get('svg g path')
      .eq(index)
      .then(($pathElement) => {
        // Trigger mouseover on the path element
        cy.wrap($pathElement).trigger('mouseover');

        // Get the tooltip element and extract its text
        return cy
          .get("[style*='fill: var(--pf-v6-chart-tooltip--Fill']")
          .should('be.visible')
          .invoke('text')
          .then((text) => {
            // Trigger mouseout to close the tooltip
            cy.wrap($pathElement).trigger('mouseout');
            // Return the trimmed tooltip text
            return cy.wrap(text.trim());
          });
      });
  }
}

class DistributedWorkloadStatusTab extends GlobalDistributedWorkloads {
  findDistributedWorkloadStatusButton() {
    return cy.get('button[aria-label="Distributed workload status tab"]');
  }

  navigateDistributedWorkloadStatusPage() {
    return this.findDistributedWorkloadStatusButton().click();
  }
}

export const globalDistributedWorkloads = new GlobalDistributedWorkloads();
export const projectMetricsTab = new ProjectMetricsTab();
export const distributedWorkloadStatusTab = new DistributedWorkloadStatusTab();
