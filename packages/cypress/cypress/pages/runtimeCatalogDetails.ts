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

  findContainerImageInput() {
    return this.findPage().findByTestId('runtime-container-image-copy').findByRole('textbox');
  }

  findCertifiedPlatforms() {
    return this.findPage().findByTestId('runtime-certified-platform');
  }

  findCertifiedPlatformLabels() {
    return this.findCertifiedPlatforms().findAllByTestId('runtime-certified-platform-label');
  }

  findServingRuntimePanel() {
    return this.findPage().findByTestId('runtime-serving-runtime-panel');
  }

  findServingRuntimeTab() {
    return this.findPage().findByTestId('runtime-serving-runtime-tab');
  }

  findLlmInferenceServicePanel() {
    return this.findPage().findByTestId('runtime-llm-inference-service-panel');
  }

  selectLlmInferenceServiceTab() {
    this.findPage().findByTestId('runtime-llm-inference-service-tab').click();
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

  copyLlmInferenceServiceYaml() {
    this.findPage().findByTestId('runtime-llm-inference-service-copy').click();
  }
}

export const runtimeCatalogDetailsPage = new RuntimeCatalogDetailsPage();
