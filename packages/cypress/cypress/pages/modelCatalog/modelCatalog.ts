import { appChrome } from '../appChrome';

class ModelCatalog {
  landingPage() {
    cy.visitWithLogin('/');
    this.waitLanding();
  }

  visit() {
    cy.visitWithLogin(`/ai-hub/catalog`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).click();
    this.wait();
  }

  private waitLanding() {
    cy.findByTestId('home-page').should('be.visible');
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Catalog');
    cy.testA11y();
  }

  tabEnabled() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('not.exist');
    return this;
  }

  findModelCatalogEmptyState() {
    return cy.findByTestId('empty-model-catalog-state');
  }

  findModelCatalogModelDetailLink() {
    return cy.findAllByTestId(`model-catalog-card-name`).first();
  }

  findModelCatalogCards() {
    return cy.findAllByTestId('model-catalog-card');
  }

  findModelCatalogCard(modelName: string) {
    return cy
      .findAllByTestId('model-catalog-card')
      .contains('[data-testid~=model-catalog-card]', modelName);
  }

  findFirstModelCatalogCard() {
    return cy.findAllByTestId('model-catalog-card').first();
  }

  findFirstModelCatalogCardLink() {
    return this.findFirstModelCatalogCard().findByTestId('model-catalog-detail-link');
  }

  findCatalogDeployButton() {
    return cy.findByTestId('deploy-button');
  }

  clickDeployModelButtonWithRetry() {
    const maxRetries = 3;
    let attempt = 0;
    const tryClick = () => {
      attempt++;
      cy.log(`Click attempt #${attempt}`);
      this.findCatalogDeployButton().click();

      cy.location('pathname').then((path) => {
        if (!path.includes('/ai-hub/deployments/deploy') && attempt < maxRetries) {
          cy.log('Wizard did not open, retrying...');
          tryClick();
        }
      });
    };
    tryClick();
    return this;
  }

  expandCardLabelGroup(modelName: string) {
    this.findModelCatalogCard(modelName)
      .findAllByTestId('model-catalog-label-group')
      .find('button')
      .click();
  }

  findCardLabelByIndex(modelName: string, index: number) {
    return this.findModelCatalogCard(modelName).findAllByTestId('model-catalog-label').eq(index);
  }

  findCardLabelByText(modelName: string, text: string) {
    return this.findModelCatalogCard(modelName)
      .findAllByTestId('model-catalog-label')
      .contains(text);
  }

  findModelCatalogCardsLabelGroup() {
    return cy.findByTestId('model-catalog-label-group');
  }

  findModelCatalogDetailsEmptyState() {
    return cy.findByTestId('empty-model-catalog-details-state');
  }

  findModelCatalogNotFoundState() {
    return cy.findByTestId('not-found-page');
  }

  findModelCards() {
    return cy.get('body').then(($body) => {
      return $body.find('[data-testid="model-catalog-card"]').length > 0;
    });
  }
}

export const modelCatalog = new ModelCatalog();
