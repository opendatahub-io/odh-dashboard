import { TableRow } from './components/table';

class ConnectionsPage {
  findTable() {
    return cy.findByTestId('connection-table');
  }

  getConnectionRow(name: string) {
    return new TableRow(() =>
      this.findTable().findAllByTestId(`table-row-title`).contains(name).parents('tr'),
    );
  }

  findDataConnectionName() {
    return cy.findByTestId('table-row-title');
  }

  findAddConnectionButton() {
    return cy.findByTestId('add-connection-button');
  }

  findCreateConnectionButton() {
    return cy.findByTestId('create-connection-button');
  }

  findKebabToggle() {
    return cy.get('button[aria-label="Kebab toggle"]');
  }

  findDeleteButton() {
    return cy.contains('.pf-v6-c-menu__item-text', 'Delete');
  }
}

export const connectionsPage = new ConnectionsPage();
