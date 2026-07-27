import { appChrome } from './appChrome';
import { TableRow } from './components/table';
import { DeleteModal } from './components/DeleteModal';

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

  findRoutingTypeLabel() {
    return this.find().findByTestId('routing-type-label');
  }
}

class LlmdRoutingSettingsPage {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/llmd-routing-configurations');
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
      name: 'llm-d routing configurations',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
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

export const llmdRoutingSettingsPage = new LlmdRoutingSettingsPage();
export const llmdRoutingCreatePage = new LlmdRoutingCreatePage();
export const deleteRouteModal = new DeleteRouteModal();
