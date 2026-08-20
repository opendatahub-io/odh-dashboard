import { appChrome } from '../appChrome';
import { TableRow } from '../components/table';
import { DashboardCodeEditor } from '../components/DashboardCodeEditor';

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

class TopologyConfigurations {
  visit(wait = true) {
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/topology-configurations',
    );
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    // The nav item targets the tabbed page's parent route, which resolves to the
    // default (or last-visited) tab — not necessarily this one. Select the
    // topology tab explicitly before waiting so wait() can't race a different
    // tab's content.
    this.findTab().click();
    this.wait();
  }

  private wait() {
    // The tab renders an empty state (no table) until the first config exists,
    // so wait for the Add button, which is present in both the empty state
    // (as the split-button primary) and the populated table header.
    this.findAddButton().should('exist');
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Model deployment settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  /** Title rendered by a breakout form page (add/edit/duplicate), not the tab. */
  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  /** Title of the tabbed "Model deployment settings" page that hosts the tab. */
  findTabPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findTab() {
    return cy.findByRole('tab', { name: 'llm-d topology configurations' });
  }

  findTable() {
    return cy.findByTestId('topology-configurations-table');
  }

  findAddButton() {
    return cy.findByTestId('add-topology-config-button');
  }

  findEmptyState() {
    return cy.findByTestId('empty-topology-configurations');
  }

  findEmptyStateAddButton() {
    return this.findEmptyState().findByTestId('add-topology-config-button');
  }

  findEmptyStateDropdownToggle() {
    return this.findEmptyState().findByTestId('add-topology-config-dropdown-toggle');
  }

  findEmptyStateDropdownItem(topologyType: string) {
    return cy.findByTestId(`add-config-${topologyType}`);
  }

  findNameInput() {
    return cy.findByTestId('topology-config-resourceName');
  }

  findDisplayNameInput() {
    return cy.findByTestId('topology-config-name');
  }

  findEditResourceNameLink() {
    return cy.findByTestId('topology-config-editResourceLink');
  }

  findDescriptionInput() {
    return cy.findByTestId('topology-config-description');
  }

  findConfigSourceSelect() {
    return cy.findByTestId('config-source-select');
  }

  selectConfigSource(optionKey: string) {
    this.findConfigSourceSelect().click();
    cy.findByTestId(optionKey).click();
  }

  findYamlEditor() {
    return cy.findByTestId('config-yaml-editor');
  }

  /**
   * The config YAML field is a PatternFly Monaco CodeEditor (no <textarea>).
   * Use this to read/write its content via the shared DashboardCodeEditor helper.
   */
  getYamlEditor() {
    return new DashboardCodeEditor(() => cy.findByTestId('config-yaml-editor'));
  }

  findSubmitButton() {
    return cy.findByTestId('submit-topology-config-button');
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

export const topologyConfigurations = new TopologyConfigurations();
