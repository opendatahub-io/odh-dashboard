class VectorDbConnection {
  findFormGroup() {
    return cy.findByTestId('configure-form-group-vector-database-connection');
  }

  findDescription() {
    return cy.findByTestId('configure-form-group-description-vector-database-connection');
  }

  findSelector() {
    return cy.findByTestId('vector-store-select-toggle');
  }

  findEmptyMessage() {
    return this.findFormGroup().contains('There are no secrets in the selected namespace');
  }

  findSplitButton() {
    return cy.findByTestId('add-vector-db-split-button');
  }

  findAddMilvusButton() {
    return cy.findByTestId('add-milvus-connection-button');
  }

  findAddMilvusMenuItem() {
    return cy.findByRole('menuitem', { name: 'Add Milvus' });
  }

  findAddPgvectorButton() {
    return cy.findByRole('menuitem', { name: 'Add PGVector' });
  }

  findModal() {
    return cy.findByTestId('vector-db-connection-modal');
  }

  findMilvusUri() {
    return this.findModal().findByTestId('vector-db-milvus-uri');
  }

  findMilvusToken() {
    return this.findModal().findByTestId('vector-db-milvus-token');
  }

  findMilvusServerCert() {
    return this.findModal().findByTestId('vector-db-milvus-server-cert');
  }

  findPgvectorHost() {
    return this.findModal().findByTestId('vector-db-pgvector-host');
  }

  findPgvectorPort() {
    return this.findModal().findByTestId('vector-db-pgvector-port');
  }

  findPgvectorDb() {
    return this.findModal().findByTestId('vector-db-pgvector-db');
  }

  findPgvectorUser() {
    return this.findModal().findByTestId('vector-db-pgvector-user');
  }

  findPgvectorPassword() {
    return this.findModal().findByTestId('vector-db-pgvector-password');
  }

  findModalSubmit() {
    return this.findModal().findByRole('button', { name: 'Add connection' });
  }
}

export const vectorDbConnection = new VectorDbConnection();
