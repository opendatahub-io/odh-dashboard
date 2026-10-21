import type { UserAuthConfig } from '../types';

const getRuntimeCatalogDetailsPath = (runtimeId: string): string =>
  `/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/${runtimeId}`;

class RuntimeCatalogDetailsPage {
  visit(runtimeId: string) {
    cy.visitWithLogin(getRuntimeCatalogDetailsPath(runtimeId));
  }

  // Visits the details page without waiting for it to render, for checking users who cannot reach it.
  visitAs(runtimeId: string, credentials: UserAuthConfig) {
    cy.visitWithLogin(getRuntimeCatalogDetailsPath(runtimeId), credentials);
  }

  findPage() {
    return cy.findByTestId('runtime-catalog-details');
  }

  findRuntimeHeading() {
    return this.findPage().findByRole('heading', { level: 1 });
  }

  findHeading(name: string) {
    return this.findPage().findByRole('heading', { name });
  }

  findCreateAction() {
    return this.findPage().findByTestId('runtime-image-install');
  }

  findInstallUnavailableTooltip() {
    return cy.findByRole('tooltip');
  }

  findLatestBadge() {
    return this.findPage().findByTestId('runtime-catalog-details-latest');
  }

  openLatestPopover() {
    this.findLatestBadge().findByRole('button', { name: 'Latest' }).click();
  }

  findLatestPopover() {
    return cy.findByTestId('runtime-catalog-details-latest-popover');
  }

  findText(text: string | RegExp) {
    return this.findPage().findByText(text);
  }

  findButton(name: string) {
    return this.findPage().findByRole('button', { name });
  }

  findLink(name: string) {
    return this.findPage().findByRole('link', { name });
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

  findLlmInferenceServicePanel() {
    return this.findPage().findByTestId('runtime-llm-inference-service-panel');
  }

  findLlmInferenceServiceTab() {
    return this.findPage().findByTestId('runtime-llm-inference-service-tab');
  }

  selectLlmInferenceServiceTab() {
    this.findLlmInferenceServiceTab().click();
  }

  copyContainerImage() {
    this.findPage()
      .findByTestId('runtime-container-image-copy')
      .findByRole('button', { name: 'Copy container image' })
      .click();
  }

  readServingRuntimeTemplateYAML() {
    return this.findServingRuntimePanel().find('code').invoke('text');
  }

  readLlmInferenceServiceConfigYAML() {
    return this.findLlmInferenceServicePanel().find('code').invoke('text');
  }

  copyServingRuntimeYaml() {
    this.findPage().findByTestId('runtime-serving-runtime-copy').click();
  }

  copyLlmInferenceServiceYaml() {
    this.findPage().findByTestId('runtime-llm-inference-service-copy').click();
  }
}

export const runtimeCatalogDetailsPage = new RuntimeCatalogDetailsPage();
