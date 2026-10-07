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

  findButton(name: string) {
    return this.findPage().findByRole('button', { name });
  }

  findVersionSelect() {
    return this.findPage().findByTestId('runtime-version-select');
  }

  selectVersion(versionId: string) {
    this.findVersionSelect().select(versionId);
  }

  findContainerImageInput() {
    return this.findPage().findByTestId('runtime-container-image-copy').findByRole('textbox');
  }

  findServingRuntimePanel() {
    return this.findPage().findByTestId('runtime-serving-runtime-panel');
  }

  findServingRuntimeTab() {
    return this.findPage().findByTestId('runtime-serving-runtime-tab');
  }

  copyContainerImage() {
    this.findPage()
      .findByTestId('runtime-container-image-copy')
      .findByRole('button', { name: 'Copy container image' })
      .click();
  }

  copyServingRuntimeYaml() {
    this.findPage().findByTestId('runtime-serving-runtime-copy').click();
  }
}

export const runtimeCatalogDetailsPage = new RuntimeCatalogDetailsPage();
