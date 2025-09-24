type AccordionSection = 'prerequisites' | 'project-setup' | 'next-steps';

type PrerequisitesAccordionItem =
  | 'taxonomy-repository'
  | 'deployed-teacher-and-judge-models'
  | 'open-container-initiative-storage-location';

type PrerequisitesAccordionButtonName = 'learn-more-taxonomy' | 'learn-more-teacher-judge-models';

type ProjectSetupAccordionItem = 'prepared-project' | 'instructlab-pipeline' | 'hardware-profiles';

type ProjectSetupAccordionButtonName = 'go-to-pipelines';

type NextStepsAccordionItem =
  | 'register-base-model'
  | 'create-lab-tuning-run'
  | 'monitor-run'
  | 'view-model';

type NextStepsAccordionButtonName = 'go-to-pipeline-runs' | 'go-to-model-registry';

type AccordionItem =
  | PrerequisitesAccordionItem
  | ProjectSetupAccordionItem
  | NextStepsAccordionItem;

type AccordionButtonName =
  | PrerequisitesAccordionButtonName
  | ProjectSetupAccordionButtonName
  | NextStepsAccordionButtonName;

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

  findNotFoundPage() {
    return cy.findByTestId('not-found-page');
  }

  findRoot() {
    return cy.findByTestId('drawer-model-customization');
  }

  findAccordionSection(section: AccordionSection) {
    return this.findRoot().findByTestId(`accordion-${section}`);
  }

  findAccordionItem(args: { section: AccordionSection; item: AccordionItem }) {
    return this.findAccordionSection(args.section).findByTestId(`accordion-item ${args.item}`);
  }

  findAccordionAnchor(args: {
    section: AccordionSection;
    item: AccordionItem;
    name: AccordionButtonName;
  }) {
    return this.findAccordionItem({ section: args.section, item: args.item }).get(
      `a[data-testid="${args.name}"]`,
    );
  }

  findAccordionButton(args: {
    section: AccordionSection;
    item: AccordionItem;
    name: AccordionButtonName;
  }) {
    return this.findAccordionItem({ section: args.section, item: args.item }).get(
      `button[data-testid="${args.name}"]`,
    );
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

  private wait() {
    this.findPage();
    cy.testA11y();
  }
}

export const modelCustomizationLandingPage = new ModelCustomizationLandingPage();
