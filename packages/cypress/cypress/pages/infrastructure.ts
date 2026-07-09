import { appChrome } from './appChrome';

class InfrastructurePage {
  visit(wait = true) {
    cy.visitWithLogin('/observe-and-monitor/infrastructure');
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Infrastructure', rootSection: 'Observe & monitor' });
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Infrastructure');
  }

  findClusterSection() {
    return cy.findByTestId('infrastructure-cluster-section');
  }

  findTotalAcceleratorsCard() {
    return cy.findByTestId('cluster-card-total-accelerators');
  }

  findComputeUtilizationCard() {
    return cy.findByTestId('cluster-card-compute-utilization');
  }

  findMemoryUtilizationCard() {
    return cy.findByTestId('cluster-card-memory-utilization');
  }

  findRefreshBadge() {
    return cy.findByTestId('infrastructure-refresh-badge');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const infrastructurePage = new InfrastructurePage();
