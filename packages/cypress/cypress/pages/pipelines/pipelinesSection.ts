class PipelinesSection {
  find() {
    return cy.findByTestId('section-pipelines-projects');
  }

  findCreatePipelineButton() {
    return cy.findByTestId('create-pipeline-button');
  }

  findImportPipelineButton() {
    return cy.findByTestId('import-pipeline-button');
  }

  findImportPipelineSplitButton() {
    return cy.findByTestId('import-pipeline-split-button');
  }

  findUploadVersionButton() {
    return this.find().find('#import-pipeline-version-button');
  }

  findAllActions() {
    return this.find().findAllByTestId('details-section-action');
  }

  findKebabActions() {
    return this.find().findByRole('button', { name: 'Pipeline server action kebab toggle' });
  }

  findKebabActionItem(name: string) {
    this.findKebabActions().click();
    return cy.findByRole('menuitem', { name });
  }
}

export const pipelinesSection = new PipelinesSection();
