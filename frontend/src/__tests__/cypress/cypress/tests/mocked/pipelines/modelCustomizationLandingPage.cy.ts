import { mockDashboardConfig } from '#~/__mocks__';
import { modelCustomizationLandingPage } from '#~/__tests__/cypress/cypress/pages/pipelines';

type HandlersProps = {
  disableFineTuning?: boolean;
};

const initIntercepts = ({ disableFineTuning = false }: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFineTuning,
    }),
  );
};

describe('Model Customization Landing Page', () => {
  describe('Feature flag disableFineTuning', () => {
    it('should not show the page if the flag is enabled', () => {
      initIntercepts({
        disableFineTuning: true,
      });
      modelCustomizationLandingPage.visit(false);
      modelCustomizationLandingPage.findNavItem().should('not.exist');
      modelCustomizationLandingPage.findNotFoundPage().should('exist');
    });

    it('should show the page if the flag is disabled', () => {
      initIntercepts({
        disableFineTuning: false,
      });
      modelCustomizationLandingPage.visit();
      modelCustomizationLandingPage.findNavItem().should('exist');
      modelCustomizationLandingPage.findPage();
    });
  });

  describe('Project Setup Section', () => {
    beforeEach(() => {
      initIntercepts({
        disableFineTuning: false,
      });

      modelCustomizationLandingPage.visit();
      modelCustomizationLandingPage.findPage();
    });

    it('should go to Pipelines when the button is clicked', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'project-setup', item: 'instructlab-pipeline' })
        .click();
      modelCustomizationLandingPage
        .findAccordionAnchor({
          section: 'project-setup',
          item: 'instructlab-pipeline',
          name: 'go-to-pipelines',
        })
        .click();
      cy.url().should('include', '/pipelines');
    });
  });

  describe('Next Steps Section', () => {
    beforeEach(() => {
      initIntercepts({
        disableFineTuning: false,
      });

      modelCustomizationLandingPage.visit();
      modelCustomizationLandingPage.findPage();
    });

    it('should go to Pipeline Runs when the button is clicked', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'next-steps', item: 'monitor-run' })
        .click();
      modelCustomizationLandingPage
        .findAccordionAnchor({
          section: 'next-steps',
          item: 'monitor-run',
          name: 'go-to-pipeline-runs',
        })
        .click();
      cy.url().should('include', '/pipelineRuns');
    });

    it('should go to Model Registry when the button is clicked', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'next-steps', item: 'view-model' })
        .click();
      modelCustomizationLandingPage
        .findAccordionAnchor({
          section: 'next-steps',
          item: 'view-model',
          name: 'go-to-model-registry',
        })
        .click();
      cy.url().should('include', '/modelRegistry');
    });
  });

  describe('Side drawer', () => {
    beforeEach(() => {
      initIntercepts({
        disableFineTuning: false,
      });

      modelCustomizationLandingPage.visit();
      modelCustomizationLandingPage.findPage();
    });

    afterEach(() => {
      modelCustomizationLandingPage.findDrawerContentCloseButton().click();
    });

    it('should open the drawer when Learn more is clicked under Taxonomy accordion item', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'prerequisites', item: 'taxonomy-repository' })
        .click();
      modelCustomizationLandingPage
        .findAccordionButton({
          section: 'prerequisites',
          item: 'taxonomy-repository',
          name: 'learn-more-taxonomy',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Creating a taxonomy for LAB-tuning');
    });

    it('should open the drawer when Learn More is clicked under Teacher and Judge accordion item', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'prerequisites', item: 'deployed-teacher-and-judge-models' })
        .click();
      modelCustomizationLandingPage
        .findAccordionButton({
          section: 'prerequisites',
          item: 'deployed-teacher-and-judge-models',
          name: 'learn-more-teacher-judge-models',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Deploying LAB teacher and LAB judge models');
    });

    it('should update the drawer content when another item is clicked', () => {
      modelCustomizationLandingPage
        .findAccordionItem({ section: 'prerequisites', item: 'taxonomy-repository' })
        .click();
      modelCustomizationLandingPage
        .findAccordionButton({
          section: 'prerequisites',
          item: 'taxonomy-repository',
          name: 'learn-more-taxonomy',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Creating a taxonomy for LAB-tuning');

      modelCustomizationLandingPage
        .findAccordionItem({ section: 'prerequisites', item: 'deployed-teacher-and-judge-models' })
        .click();
      modelCustomizationLandingPage
        .findAccordionButton({
          section: 'prerequisites',
          item: 'deployed-teacher-and-judge-models',
          name: 'learn-more-teacher-judge-models',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Deploying LAB teacher and LAB judge models');
    });
  });
});
