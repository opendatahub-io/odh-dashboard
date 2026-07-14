import { appChrome } from './appChrome';
import { TableRow } from './components/table';

class TopologyConfigRow extends TableRow {
  findEnabledSwitch() {
    return this.find().findByTestId('topology-config-enabled-toggle').parent('label');
  }

  shouldHavePreInstalledLabel(enabled = true) {
    this.find()
      .findByTestId('pre-installed-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  findTopologyType() {
    return this.find().find('[data-label="Topology type"]');
  }
}

class LlmdTopologySettingsPage {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/llmd-topology-configurations');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findTable();
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'llm-d topology configurations',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  findTable() {
    return cy.findByTestId('topology-configurations-table');
  }

  findAddButton() {
    return cy.findByTestId('add-topology-config-button');
  }

  getRow(name: string) {
    return new TopologyConfigRow(
      () =>
        this.findTable().findByTestId(
          `topology-config-row-${name}`,
        ) as unknown as Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    );
  }
}

export const llmdTopologySettingsPage = new LlmdTopologySettingsPage();
