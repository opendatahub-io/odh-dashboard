import { mockDashboardConfig } from '~/__mocks__';
import { modelCustomizationLandingPage } from '~/__tests__/cypress/cypress/pages/pipelines';

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

  describe.skip('TODO: Drawer tests disabled while we do not have the contents yet', () => {
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
      modelCustomizationLandingPage.findPrerequisitesAccordionItem('taxonomy-repository').click();
      modelCustomizationLandingPage
        .findPrerequisitesAccordionArchorButton({
          item: 'taxonomy-repository',
          name: 'learn-more-taxonomy',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Learn how to construct and build a taxonomy repository');
    });

    it('should open the drawer when Learn More is clicked under Teacher and Judge accordion item', () => {
      modelCustomizationLandingPage
        .findPrerequisitesAccordionItem('deployed-teacher-and-judge-models')
        .click();
      modelCustomizationLandingPage
        .findPrerequisitesAccordionArchorButton({
          item: 'deployed-teacher-and-judge-models',
          name: 'learn-more-teacher-judge-models',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Learn how to find and deploy teacher and judge models');
    });

    it('should update the drawer content when another item is clicked', () => {
      modelCustomizationLandingPage.findPrerequisitesAccordionItem('taxonomy-repository').click();
      modelCustomizationLandingPage
        .findPrerequisitesAccordionArchorButton({
          item: 'taxonomy-repository',
          name: 'learn-more-taxonomy',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Learn how to construct and build a taxonomy repository');

      modelCustomizationLandingPage
        .findPrerequisitesAccordionItem('deployed-teacher-and-judge-models')
        .click();
      modelCustomizationLandingPage
        .findPrerequisitesAccordionArchorButton({
          item: 'deployed-teacher-and-judge-models',
          name: 'learn-more-teacher-judge-models',
        })
        .click();
      modelCustomizationLandingPage
        .findDrawerContentTitle()
        .should('have.text', 'Learn how to find and deploy teacher and judge models');
    });
  });
});
