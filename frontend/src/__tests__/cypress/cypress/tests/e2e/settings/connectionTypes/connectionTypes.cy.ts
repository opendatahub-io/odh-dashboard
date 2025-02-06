import { connectionTypesPage } from '~/__tests__/cypress/cypress/pages/connectionTypes';
import type { OOTBConnectionTypesData } from '~/__tests__/cypress/cypress/types';
import { loadOOTBConnectionTypesFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';

describe('Verify OOTB Connection Types', () => {
  let testData: OOTBConnectionTypesData;

  before(() => {
    return loadOOTBConnectionTypesFixture('e2e/connectionTypes/testOOTBConnectionType.yaml').then(
      (fixtureData: OOTBConnectionTypesData) => {
        testData = fixtureData;
      },
    );
  });

  it(
    'should have pre-installed label and unable to be edited or deleted',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard'] },
    () => {
      cy.step('Navigate to Connection Types view');
      cy.visitWithLogin('/connectionTypes', HTPASSWD_CLUSTER_ADMIN_USER);

      connectionTypesPage.shouldHaveConnectionTypes();
      const uri = connectionTypesPage.getConnectionTypeRow(testData.uri);
      const s3 = connectionTypesPage.getConnectionTypeRow(testData.s3);

      cy.step('Ensure Pre-installed label is present on OOTB Connections');
      connectionTypesPage.shouldHaveConnectionTypes();
      uri.shouldShowPreInstalledLabel();
      s3.shouldShowPreInstalledLabel();

      cy.step('Ensure OOTB connections are not editable or deletable');
      ['Edit', 'Delete'].forEach((action) => {
        s3.find().findKebabAction(action).should('not.exist');
        s3.findKebab().click(); // need to close the kebab since the popup will block the next row's kebab
        uri.find().findKebabAction(action).should('not.exist');
      });
    },
  );
});
