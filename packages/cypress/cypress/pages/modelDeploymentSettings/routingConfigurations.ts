import { appChrome } from '../appChrome';
import { TableRow } from '../components/table';
import { DeleteModal } from '../components/DeleteModal';
import { DashboardCodeEditor } from '../components/DashboardCodeEditor';

class RoutingConfigRow extends TableRow {
  findEnabledSwitch() {
    return this.find().findByTestId('routing-config-enabled-toggle').parent('label');
  }

  shouldHavePreInstalledLabel(enabled = true) {
    this.find()
      .findByTestId('pre-installed-label')
      .should(enabled ? 'exist' : 'not.exist');
    return this;
  }

  findTopologyTypeCell() {
    return this.find().find('[data-label="Topology type"]');
  }
}

class RoutingConfigurations {
  visit(wait = true) {
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/routing-configurations',
    );
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    // The nav item targets the tabbed page's parent route, which resolves to the
    // default (or last-visited) tab — not necessarily this one. Select the
    // routing tab explicitly before waiting so wait() can't race a different
    // tab's content.
    this.findTab().click();
    this.wait();
  }

  private wait() {
    // The tab renders an empty state (no table) until the first config exists,
    // so wait for the Add button, which is present in both the empty and
    // populated states, rather than the table.
    this.findAddButton().should('exist');
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Model deployment settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  /** Title of the tabbed "Model deployment settings" page that hosts the tab. */
  findTabPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findTab() {
    return cy.findByRole('tab', { name: 'llm-d routing configurations' });
  }

  findTable() {
    return cy.findByTestId('routing-configurations-table');
  }

  findAddButton() {
    return cy.findByTestId('add-routing-config-button');
  }

  findEmptyState() {
    return cy.findByTestId('empty-routing-configurations');
  }

  findEmptyStateAddButton() {
    return this.findEmptyState().findByTestId('add-routing-config-button');
  }

  getRow(name: string) {
    return new RoutingConfigRow(
      () =>
        this.findTable().findByTestId(`routing-config-row-${name}`) as unknown as Cypress.Chainable<
          JQuery<HTMLTableRowElement>
        >,
    );
  }
}

class LlmdRoutingCreatePage {
  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findDisplayNameInput() {
    return cy.findByTestId('routing-config-name');
  }

  findTopologyTypeSelect() {
    return cy.findByTestId('topology-type-select');
  }

  selectTopologyType(topologyTypeTestId: string) {
    this.findTopologyTypeSelect().click();
    cy.findByTestId(topologyTypeTestId).click();
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
    return cy.findByTestId('submit-routing-config-button');
  }

  findCancelButton() {
    return cy.findByTestId('cancel-routing-config-button');
  }
}

class DeleteRouteModal extends DeleteModal {
  constructor() {
    super(/Delete llm-d routing configuration/);
  }
}

export const routingConfigurations = new RoutingConfigurations();
export const llmdRoutingCreatePage = new LlmdRoutingCreatePage();
export const deleteRouteModal = new DeleteRouteModal();
