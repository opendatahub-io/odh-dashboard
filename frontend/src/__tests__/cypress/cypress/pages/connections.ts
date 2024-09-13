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
}

export const connectionsPage = new ConnectionsPage();
