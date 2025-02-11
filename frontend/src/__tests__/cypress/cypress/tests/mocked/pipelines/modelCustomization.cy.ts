import { mockDashboardConfig } from '~/__mocks__';
import { modelCustomizationGlobal } from '~/__tests__/cypress/cypress/pages/pipelines';

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

describe('Model Customization', () => {
  describe('Feature flag disableFineTuning', () => {
    it('should not show the page if the flag is enabled', () => {
      initIntercepts({
        disableFineTuning: true,
      });
      modelCustomizationGlobal.visit(false);
      modelCustomizationGlobal.findNavItem().should('not.exist');
      modelCustomizationGlobal.findNotFoundPage().should('exist');
    });

    it('should show the page if the flag is disabled', () => {
      initIntercepts({
        disableFineTuning: false,
      });
      modelCustomizationGlobal.visit();
      modelCustomizationGlobal.findNavItem().should('exist');
      modelCustomizationGlobal.findPage();
    });
  });

  describe('Drawer', () => {
    beforeEach(() => {
      initIntercepts({
        disableFineTuning: false,
      });

      modelCustomizationGlobal.visit();
      modelCustomizationGlobal.findPage();
    });

    afterEach(() => {
      modelCustomizationGlobal.findDrawerContentCloseButton().click();
    });

    it('should open the drawer when Learn more is clicked under Taxonomy accordion item', () => {
      modelCustomizationGlobal.findPrerequisitesAccordionItem('taxonomy').click();
      modelCustomizationGlobal
        .findPrerequisitesAccordionButton({ item: 'taxonomy', name: 'learn-more-taxonomy' })
        .click();
      modelCustomizationGlobal.findDrawerContentTitle().should('have.text', 'Taxonomy');
    });

    it('should open the drawer when Learn More is clicked under Teacher and Judge accordion item', () => {
      modelCustomizationGlobal.findPrerequisitesAccordionItem('teacher-and-judge').click();
      modelCustomizationGlobal
        .findPrerequisitesAccordionButton({
          item: 'teacher-and-judge',
          name: 'learn-more-teacher-and-judge',
        })
        .click();
      modelCustomizationGlobal
        .findDrawerContentTitle()
        .should('have.text', 'Deployed teacher and judge models');
    });

    it('should open the drawer when Check Access is clicked under OCI Storage accordion item', () => {
      modelCustomizationGlobal.findPrerequisitesAccordionItem('oci-storage').click();
      modelCustomizationGlobal.findCheckAccessButton().click();
      modelCustomizationGlobal.findDrawerContentTitle().should('have.text', 'Model registries');
    });

    it('should update the drawer content when another item is clicked', () => {
      modelCustomizationGlobal.findPrerequisitesAccordionItem('oci-storage').click();
      modelCustomizationGlobal.findCheckAccessButton().click();
      modelCustomizationGlobal.findDrawerContentTitle().should('have.text', 'Model registries');

      modelCustomizationGlobal.findPrerequisitesAccordionItem('taxonomy').click();
      modelCustomizationGlobal
        .findPrerequisitesAccordionButton({ item: 'taxonomy', name: 'learn-more-taxonomy' })
        .click();
      modelCustomizationGlobal.findDrawerContentTitle().should('have.text', 'Taxonomy');
    });
  });
});
