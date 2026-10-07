class RuntimeCatalogDetailsPage {
  visit(runtimeId: string) {
    cy.visitWithLogin(
      `/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/${runtimeId}`,
    );
  }

  findPage() {
    return cy.findByTestId('runtime-catalog-details');
  }

  findHeading(name: string) {
    return this.findPage().findByRole('heading', { name });
  }

  findText(text: string | RegExp) {
    return this.findPage().findByText(text);
  }

  findAllText(text: string) {
    return this.findPage().findAllByText(text);
  }

  findButton(name: string) {
    return this.findPage().findByRole('button', { name });
  }

  findContainerImageInput() {
    return this.findPage().findByTestId('runtime-container-image-copy').findByRole('textbox');
  }

  findTemplatePanel(name: string) {
    return this.findPage().findByRole('tabpanel', { name });
  }

  selectConfigurationTab(name: string) {
    this.findPage().findByRole('tab', { name }).click();
  }

  copyContainerImage() {
    this.findButton('Copy container image').click();
  }

  copySelectedYaml() {
    this.findButton('Copy to clipboard').click();
  }
}

export const runtimeCatalogDetailsPage = new RuntimeCatalogDetailsPage();
