import {
  customServingRuntimesIntercept,
  interceptTemplatePatch,
  interceptDashboardConfigPatch,
} from './customServingRuntimesUtils';
import { servingRuntimes } from '../../../pages/servingRuntimes';
import { unsupportedStatusAcceptanceModal } from '../../../pages/llmAcceleratorConfigs';
import { asProductAdminUser } from '../../../utils/mockUsers';

describe('Custom serving runtimes — unsupported resource handling', () => {
  beforeEach(() => {
    asProductAdminUser();
    customServingRuntimesIntercept();

    servingRuntimes.visit();
  });

  it('should show toggle OFF for unsupported unaccepted template', () => {
    servingRuntimes.getRowById('template-unsupported-unaccepted').shouldBeEnabled(false);
    servingRuntimes.getRowById('template-unsupported-unaccepted').shouldHaveUnsupportedLabel(true);
  });

  it('should show acceptance modal when toggling on an unsupported unaccepted template', () => {
    unsupportedStatusAcceptanceModal.shouldNotExist();

    servingRuntimes.getRowById('template-unsupported-unaccepted').findEnabledToggle().click();

    unsupportedStatusAcceptanceModal.shouldBeOpen();
    unsupportedStatusAcceptanceModal
      .find()
      .should('contain.text', 'Enable limited-support runtime?');
  });

  it('should dismiss modal without patching when cancel is clicked', () => {
    servingRuntimes.getRowById('template-unsupported-unaccepted').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findCancelButton().click();

    unsupportedStatusAcceptanceModal.shouldNotExist();
    servingRuntimes.getRowById('template-unsupported-unaccepted').shouldBeEnabled(false);
  });

  it('should patch template annotation and enable when accept is clicked', () => {
    interceptTemplatePatch('template-unsupported-unaccepted');
    interceptDashboardConfigPatch();

    servingRuntimes.getRowById('template-unsupported-unaccepted').findEnabledToggle().click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findAcceptButton().should('be.disabled');
    unsupportedStatusAcceptanceModal.findAcceptanceCheckbox().click();
    unsupportedStatusAcceptanceModal.findAcceptButton().click();

    cy.wait('@patchTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          op: 'add',
          path: '/metadata/annotations/opendatahub.io~1unsupported-status-accepted',
          value: 'true',
        },
      ]);
    });
    cy.wait('@patchDashboardConfig');
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should toggle already-accepted unsupported template normally without modal', () => {
    interceptDashboardConfigPatch();
    servingRuntimes.getRowById('template-unsupported-accepted').shouldBeEnabled(true);

    servingRuntimes.getRowById('template-unsupported-accepted').findEnabledToggle().click();

    cy.wait('@patchDashboardConfig');
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should show limited support label on unsupported templates', () => {
    servingRuntimes.getRowById('template-unsupported-unaccepted').shouldHaveUnsupportedLabel(true);
    servingRuntimes.getRowById('template-unsupported-accepted').shouldHaveUnsupportedLabel(true);
  });

  it('should not show limited support label on normal templates', () => {
    servingRuntimes.getRowById('template-1').shouldHaveUnsupportedLabel(false);
  });

  it('should show version label on templates with version annotation', () => {
    servingRuntimes
      .getRowById('template-unsupported-unaccepted')
      .findServingRuntimeVersionLabel()
      .should('have.text', '0.11.0+rhai5');
  });
});
