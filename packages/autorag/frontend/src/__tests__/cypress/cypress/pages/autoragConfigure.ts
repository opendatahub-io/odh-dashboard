class AutoragConfigurePage {
  findEditModelsButton() {
    return cy.findByTestId('edit-models-button');
  }

  findModelSettingsModal() {
    return cy.findByTestId('experiment-settings-modal');
  }

  findGenerationTable() {
    return cy.findByTestId('llm-models-table');
  }

  findEmbeddingTab() {
    return cy.findByTestId('embedding-models-tab');
  }

  findEmbeddingTable() {
    return cy.findByTestId('embedding-models-table');
  }

  findModelRow(modelId: string) {
    return cy.findByTestId(`model-row-${modelId}`);
  }

  findSaveModelsButton() {
    return cy.findByTestId('experiment-settings-save');
  }
}

export const autoragConfigurePage = new AutoragConfigurePage();
