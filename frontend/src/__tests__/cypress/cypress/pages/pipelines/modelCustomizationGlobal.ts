import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

type PrerequisitesAccordionItem =
  | 'taxonomy'
  | 'teacher-and-judge'
  | 'pipeline-server'
  | 'oci-storage';

type PrerequisitesAccordionButtonName =
  | 'learn-more-taxonomy'
  | 'learn-more-teacher-and-judge'
  | 'go-to-projects'
  | 'go-to-model-catalog';

class ModelCustomizationGlobal {
  visit(wait = true) {
    cy.visitWithLogin(`/modelCustomization`);
    if (wait) {
      this.wait();
    }
  }

  findPage() {
    return cy.findByTestId('app-page-title').should('have.text', 'Model Customization');
  }

  findNavItem() {
    return appChrome.findNavItem('Model Customization', 'Data Science Pipelines');
  }

  findNotFoundPage() {
    return cy.findByTestId('not-found-page');
  }

  findRoot() {
    return cy.findByTestId('drawer-model-customization');
  }

  findPrerequisitesAccordion() {
    return this.findRoot().findByTestId('accordion-prerequisites');
  }

  findPrerequisitesAccordionItem(item: PrerequisitesAccordionItem) {
    return this.findPrerequisitesAccordion().findByTestId(`accordion-item ${item}`);
  }

  findPrerequisitesAccordionButton(args: {
    item: PrerequisitesAccordionItem;
    name: PrerequisitesAccordionButtonName;
  }) {
    return this.findPrerequisitesAccordionItem(args.item).get(`button[data-testid="${args.name}"]`);
  }

  findCheckAccessButton() {
    return this.findPrerequisitesAccordionItem('oci-storage').get(`a[data-testid="check-access"]`);
  }

  findFineTuneFromModelCatalogButton() {
    return this.findRoot().get(`button[data-testid="fine-tune-from-model-catalog"]`);
  }

  findGoToPipelinesButton() {
    return this.findRoot().get(`button[data-testid="go-to-pipelines"]`);
  }

  findDrawerContent() {
    return this.findRoot().findByTestId('drawer-content');
  }

  findDrawerContentTitle() {
    return this.findDrawerContent().findByTestId('title');
  }

  findDrawerContentCloseButton() {
    return this.findDrawerContent().findByTestId('close');
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findPage();
    cy.testA11y();
  }
}

export const modelCustomizationGlobal = new ModelCustomizationGlobal();
