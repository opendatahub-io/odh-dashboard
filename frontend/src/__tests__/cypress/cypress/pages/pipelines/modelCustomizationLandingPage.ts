import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

type PrerequisitesAccordionItem =
  | 'taxonomy-repository'
  | 'deployed-teacher-and-judge-models'
  | 'open-container-initiative-storage-location';

type PrerequisitesAccordionButtonName = 'learn-more-taxonomy' | 'learn-more-teacher-judge-models';

class ModelCustomizationLandingPage {
  visit(wait = true) {
    cy.visitWithLogin(`/modelCustomization`);
    if (wait) {
      this.wait();
    }
  }

  findPage() {
    return cy.findByTestId('app-page-title').should('have.text', 'Model customization');
  }

  findNavItem() {
    return appChrome.findNavItem('Model customization', 'Models');
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

  findPrerequisitesAccordionArchorButton(args: {
    item: PrerequisitesAccordionItem;
    name: PrerequisitesAccordionButtonName;
  }) {
    return this.findPrerequisitesAccordionItem(args.item).get(`a[data-testid="${args.name}"]`);
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

export const modelCustomizationLandingPage = new ModelCustomizationLandingPage();
