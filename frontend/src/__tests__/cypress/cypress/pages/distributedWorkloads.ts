import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class GlobalDistributedWorkloads {
  visit(wait = true) {
    cy.visitWithLogin(`/distributedWorkloads`);
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem('Workload Metrics');
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  findHeaderText() {
    return cy.findByText('Monitor the metrics of your active resources.');
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }

  private wait() {
    this.findHeaderText();
    cy.testA11y();
  }
}

export const globalDistributedWorkloads = new GlobalDistributedWorkloads();
