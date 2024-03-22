class PipelinesSection {
  find() {
    return cy.findByTestId('section-pipelines-projects');
  }

  findImportPipelineButton() {
    return cy.findByTestId('import-pipeline-split-button');
  }

  findUploadVersionButton() {
    return this.find().find('#import-pipeline-version-button');
  }

  findAllActions() {
    return this.find().findAllByTestId('details-section-action');
  }

  findKebabActions() {
    return this.find().findKebab(true);
  }

  findKebabActionItem(name: string) {
    return this.find().findKebabAction(name, true);
  }
}

export const pipelinesSection = new PipelinesSection();
