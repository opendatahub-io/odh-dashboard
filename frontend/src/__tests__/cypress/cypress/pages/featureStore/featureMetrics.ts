import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class FeatureMetricsOverview extends Contextual<HTMLElement> {
  findMetricsOverview() {
    return cy.findByTestId('feature-store-metrics-overview');
  }

  findResourceCountsCard(title: string) {
    const testId = `feature-store-metrics-card-${title.toLowerCase()}`;
    return cy.findByTestId(testId, { timeout: 10000 }).scrollIntoView();
  }

  findEntitiesCard() {
    return this.findResourceCountsCard('Entities');
  }

  findDataSourcesCard() {
    return this.findResourceCountsCard('Data sources');
  }

  findSavedDatasetsCard() {
    return this.findResourceCountsCard('Datasets');
  }

  findFeaturesCard() {
    return this.findResourceCountsCard('Features');
  }

  findFeatureViewsCard() {
    return this.findResourceCountsCard('Feature Views');
  }

  findFeatureServicesCard() {
    return this.findResourceCountsCard('Feature Services');
  }

  findPopularTagsTitle() {
    return cy.findByTestId('popular-tags-title', { timeout: 10000 }).scrollIntoView();
  }

  findPopularTagCard(tagKey: string, tagValue: string) {
    const testId = `feature-store-popular-tag-card-${tagKey}-${tagValue}`;
    return cy.findByTestId(testId, { timeout: 10000 }).scrollIntoView();
  }

  findEmptyStateTitle() {
    return cy.findByTestId('empty-state-title');
  }

  findPopularTagsEmptyStateTitle() {
    return cy.findByTestId('popular-tags-empty-state-title');
  }

  findRecentlyVisitedEmptyStateTitle() {
    return cy.findByTestId('recently-visited-resources-empty-state-title');
  }

  findEmptyStateBody() {
    return cy.findByTestId('empty-state-body');
  }

  findErrorLoadingPopularTags() {
    return cy.findByTestId('error-loading-popular-tags', { timeout: 10000 }).scrollIntoView();
  }

  findRecentlyVisitedTitle() {
    return cy.findByTestId('recently-visited-resources-title', { timeout: 10000 }).scrollIntoView();
  }

  findRecentlyVisitedTable() {
    return cy.findByTestId('recently-visited-resources-table', { timeout: 10000 }).scrollIntoView();
  }

  shouldHaveEntitiesCount(count: number) {
    this.findEntitiesCard().should('contain.text', count);
    return this;
  }

  shouldHaveDataSourcesCount(count: number) {
    this.findDataSourcesCard().should('contain.text', count);
    return this;
  }

  shouldHaveSavedDatasetsCount(count: number) {
    this.findSavedDatasetsCard().should('contain.text', count);
    return this;
  }

  shouldHaveFeaturesCount(count: number) {
    this.findFeaturesCard().should('contain.text', count);
    return this;
  }

  shouldHaveFeatureViewsCount(count: number) {
    this.findFeatureViewsCard().should('contain.text', count);
    return this;
  }

  shouldHaveFeatureServicesCount(count: number) {
    this.findFeatureServicesCard().should('contain.text', count);
    return this;
  }

  shouldHavePopularTagsTitle() {
    this.findPopularTagsTitle().should('be.visible');
    return this;
  }

  shouldHavePopularTagCard(tagKey: string, tagValue: string) {
    this.findPopularTagCard(tagKey, tagValue).should('be.visible');
    return this;
  }

  shouldHaveFeatureViewInPopularTag(tagKey: string, tagValue: string, featureViewName: string) {
    this.findPopularTagCard(tagKey, tagValue)
      .find('a')
      .contains(featureViewName)
      .should('be.visible');
    return this;
  }

  shouldHaveFeatureViewsCountInPopularTag(tagKey: string, tagValue: string, count: number) {
    this.findPopularTagCard(tagKey, tagValue)
      .find('a')
      .contains(`View all (${count})`)
      .should('be.visible');
    return this;
  }

  shouldShowEmptyState() {
    this.findEmptyStateTitle().should('be.visible');
    this.findEmptyStateBody().should('be.visible');
    return this;
  }

  shouldShowEmptyStateWithTitle(expectedTitle: string) {
    this.findEmptyStateTitle().should('be.visible').contains(expectedTitle);
    return this;
  }

  shouldShowRecentlyVisitedEmptyState() {
    this.findRecentlyVisitedEmptyStateTitle()
      .should('be.visible')
      .contains('No recently visited resources.');
    return this;
  }

  shouldShowPopularTagsEmptyState() {
    this.findPopularTagsEmptyStateTitle().should('be.visible').contains('No feature views yet');
    return this;
  }

  shouldHaveRecentlyVisitedTitle() {
    this.findRecentlyVisitedTitle().should('be.visible');
    return this;
  }

  shouldHaveRecentlyVisitedTable() {
    this.findRecentlyVisitedTable().should('be.visible');
    return this;
  }

  shouldHaveRecentlyVisitedRow(resourceName: string) {
    this.findRecentlyVisitedTable()
      .find('tr')
      .filter(`:contains("${resourceName}")`)
      .should('be.visible');
    return this;
  }

  shouldHaveRecentlyVisitedRowWithDetails(resourceName: string, resourceType: string) {
    const row = this.findRecentlyVisitedTable().find('tr').filter(`:contains("${resourceName}")`);

    row.should('be.visible');
    row.find('[data-label="Resource name"]').should('contain.text', resourceName);
    row.find('[data-label="Resource type"]').should('contain.text', resourceType);
    return this;
  }

  clickGoToEntities() {
    this.findEntitiesCard().find('a').contains('Go to Entities').click();
    return this;
  }

  clickGoToDataSources() {
    this.findDataSourcesCard().find('a').contains('Go to Data Sources').click();
    return this;
  }

  clickGoToSavedDatasets() {
    this.findSavedDatasetsCard().find('a').contains('Go to Saved Datasets').click();
    return this;
  }

  clickGoToFeatures() {
    this.findFeaturesCard().find('a').contains('Go to Features').click();
    return this;
  }

  clickGoToFeatureViews() {
    this.findFeatureViewsCard().find('a').contains('Go to Feature Views').click();
    return this;
  }

  clickGoToFeatureServices() {
    this.findFeatureServicesCard().find('a').contains('Go to Feature Services').click();
    return this;
  }

  shouldDisplayResourceCounts() {
    this.findEntitiesCard().should('be.visible');
    this.findDataSourcesCard().should('be.visible');
    this.findSavedDatasetsCard().should('be.visible');
    this.findFeaturesCard().should('be.visible');
    this.findFeatureViewsCard().should('be.visible');
    this.findFeatureServicesCard().should('be.visible');
    return this;
  }

  shouldDisplayPopularTags() {
    this.findPopularTagsTitle().should('be.visible');
    return this;
  }

  shouldDisplayRecentlyVisited() {
    this.findRecentlyVisitedTitle().should('be.visible');
    return this;
  }

  shouldHaveErrorLoadingPopularTags() {
    this.findErrorLoadingPopularTags().should('be.visible');
    return this;
  }

  findPopularTagRow(tagKey: string, tagValue: string) {
    return new FeatureMetricsPopularTagRow(() => this.findPopularTagCard(tagKey, tagValue));
  }

  findRecentlyVisitedRow(resourceName: string) {
    return new FeatureMetricsRecentlyVisitedRow(() =>
      this.findRecentlyVisitedTable().find('tr').filter(`:contains("${resourceName}")`),
    );
  }
}

class FeatureMetricsPopularTagRow extends Contextual<HTMLElement> {
  findTagTitle() {
    return this.find().find('.pf-c-card__title');
  }

  findFeatureViewsList() {
    return this.find().find('ul');
  }

  findFeatureViewLink(featureViewName: string) {
    return this.find().find('a').contains(featureViewName);
  }

  findViewAllLink() {
    return this.find().find('a').contains('View all');
  }

  shouldHaveTagKey(tagKey: string) {
    this.findTagTitle().should('contain.text', tagKey);
    return this;
  }

  shouldHaveTagValue(tagValue: string) {
    this.findTagTitle().should('contain.text', tagValue);
    return this;
  }

  shouldHaveFeatureViewsCount(count: number) {
    this.findViewAllLink().should('contain.text', count.toString());
    return this;
  }

  clickFeatureViewLink(featureViewName: string) {
    this.findFeatureViewLink(featureViewName).click();
  }

  clickViewAllLink() {
    this.findViewAllLink().click();
  }
}

class FeatureMetricsRecentlyVisitedRow extends Contextual<HTMLElement> {
  findResourceName() {
    return this.find().find('[data-label="Resource name"]');
  }

  findResourceType() {
    return this.find().find('[data-label="Resource type"]');
  }

  findLastViewed() {
    return this.find().find('[data-label="Last viewed"]');
  }

  findResourceLink() {
    return this.findResourceName().find('a');
  }

  shouldHaveResourceName(name: string) {
    this.findResourceName().should('contain.text', name);
    return this;
  }

  shouldHaveResourceType(type: string) {
    this.findResourceType().should('contain.text', type);
    return this;
  }

  clickResourceLink() {
    this.findResourceLink().click();
  }
}

export const featureMetricsOverview = new FeatureMetricsOverview(() =>
  cy.findByTestId('feature-store-metrics-overview'),
);
