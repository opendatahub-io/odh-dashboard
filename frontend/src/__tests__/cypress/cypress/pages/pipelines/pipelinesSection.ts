class PipelinesSection {
  find() {
    return cy.get('#pipelines-projects');
  }

  findImportPipelineButton() {
    return cy.findByTestId('import-pipeline-split-button');
  }

  findUploadVersionButton() {
    return cy.get('#import-pipeline-version-button');
  }
}

export const pipelinesSection = new PipelinesSection();
