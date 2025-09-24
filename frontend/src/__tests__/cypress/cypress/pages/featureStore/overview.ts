class FeatureStoreOverview {
  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findMetricsTab() {
    return cy.findByTestId('metrics-tab');
  }

  findLineageTab() {
    return cy.findByTestId('lineage-tab');
  }
}

export const featureStoreOverview = new FeatureStoreOverview();
