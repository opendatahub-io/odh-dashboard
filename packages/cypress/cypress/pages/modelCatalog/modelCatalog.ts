import { appChrome } from '../appChrome';

class ModelCatalog {
  landingPage() {
    cy.visitWithLogin('/');
    this.waitLanding();
  }

  visit() {
    cy.visitWithLogin(`/ai-hub/models/catalog`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Models', rootSection: 'AI hub' }).click();
    this.wait();
  }

  private waitLanding() {
    cy.findByTestId('home-page').should('be.visible');
  }

  private wait() {
    cy.findByTestId('app-tab-page-title').should('exist');
    cy.findByText('Discover models that are available for your organization', {
      exact: false,
    }).should('exist');
    cy.testA11y();
  }

  tabEnabled() {
    appChrome.findNavItem({ name: 'Models', rootSection: 'AI hub' }).should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem({ name: 'Models', rootSection: 'AI hub' }).should('not.exist');
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
        if (!path.includes('/ai-hub/models/deployments/deploy') && attempt < maxRetries) {
          cy.log('Wizard did not open, retrying...');
          tryClick();
        }
      });
    };
    tryClick();
    return this;
  }

  expandCardLabelGroup(modelName: string) {
    this.findModelCatalogCard(modelName).then(($card) => {
      const overflowBtn = $card.find('.pf-v6-c-label.pf-m-overflow');
      if (overflowBtn.length) {
        cy.wrap(overflowBtn).click();
      }
    });
  }

  expandFirstCardLabelGroup() {
    this.findFirstModelCatalogCard().then(($card) => {
      const overflowBtn = $card.find('.pf-v6-c-label.pf-m-overflow');
      if (overflowBtn.length) {
        cy.wrap(overflowBtn).click();
      }
    });
  }

  findFirstCardLabelWithIcon(text: string) {
    return this.findFirstModelCatalogCard().contains('[data-testid="model-catalog-label"]', text);
  }

  findValidatedTaskIcon() {
    return this.findFirstModelCatalogCard().findByTestId('validated-task-icon');
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

  findPerformanceViewToggle() {
    return cy.findByTestId('model-performance-view-toggle');
  }

  togglePerformanceView() {
    this.findPerformanceViewToggle().click({ force: true });
    return this;
  }

  findWorkloadTypeFilter() {
    return cy.findByTestId('workload-type-filter');
  }

  findLatencyFilter() {
    return cy.findByTestId('latency-filter');
  }

  findMaxRpsFilter() {
    return cy.findByTestId('max-rps-filter');
  }

  findSortDropdown() {
    return cy.findByTestId('model-catalog-sort');
  }

  findValidatedModelCard() {
    return cy
      .findAllByTestId('model-catalog-card', { timeout: 10000 })
      .filter(':has([data-testid="validated-model-hardware"])');
  }

  findValidatedModelCardLink() {
    return this.findValidatedModelCard().first().findByTestId('model-catalog-detail-link');
  }

  findValidatedModelHardware() {
    return cy.findByTestId('validated-model-hardware');
  }

  findValidatedModelReplicas() {
    return cy.findByTestId('validated-model-replicas');
  }

  findValidatedModelLatency() {
    return cy.findByTestId('validated-model-latency');
  }

  findValidatedModelBenchmarkLink() {
    return cy.findByTestId('validated-model-benchmark-link');
  }

  findColdStartLoadTimeFilter() {
    return cy.findByTestId('cold-start-load-time-filter');
  }

  findMinimumVramFilter() {
    return cy.findByTestId('minimum-vram-filter');
  }

  findContainerSizeFilter() {
    return cy.findByTestId('container-size-filter');
  }

  findValidatedArgumentsFilter() {
    return cy.findByTestId('Validated arguments-filter');
  }

  findValidatedArgumentsFilterCheckbox() {
    return cy.findByTestId('Validated arguments-tool-calling-checkbox');
  }
}

export const modelCatalog = new ModelCatalog();
