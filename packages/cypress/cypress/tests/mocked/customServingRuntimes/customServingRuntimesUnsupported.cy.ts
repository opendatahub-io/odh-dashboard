import {
  customServingRuntimesIntercept,
  interceptTemplatePatch,
  interceptDashboardConfigPatch,
} from './customServingRuntimesUtils';
import { servingRuntimeTemplates } from '../../../pages/modelDeploymentSettings/servingRuntimeTemplates';
import { unsupportedStatusAcceptanceModal } from '../../../pages/modelDeploymentSettings/llmAcceleratorConfigurations';
import { asProductAdminUser } from '../../../utils/mockUsers';

describe('Custom serving runtimes — unsupported resource handling', () => {
  beforeEach(() => {
    asProductAdminUser();
    customServingRuntimesIntercept();

    servingRuntimeTemplates.visit();
  });

  it('should show toggle OFF for unsupported unaccepted template', () => {
    servingRuntimeTemplates.getRowById('template-unsupported-unaccepted').shouldBeEnabled(false);
    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .shouldHaveUnsupportedLabel(true);
  });

  it('should show acceptance modal when toggling on an unsupported unaccepted template', () => {
    unsupportedStatusAcceptanceModal.shouldNotExist();

    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .findEnabledToggle()
      .click();

    unsupportedStatusAcceptanceModal.shouldBeOpen();
    unsupportedStatusAcceptanceModal
      .find()
      .should('contain.text', 'Enable limited-support runtime?');
  });

  it('should dismiss modal without patching when cancel is clicked', () => {
    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .findEnabledToggle()
      .click();
    unsupportedStatusAcceptanceModal.shouldBeOpen();

    unsupportedStatusAcceptanceModal.findCancelButton().click();

    unsupportedStatusAcceptanceModal.shouldNotExist();
    servingRuntimeTemplates.getRowById('template-unsupported-unaccepted').shouldBeEnabled(false);
  });

  it('should patch template annotation and enable when accept is clicked', () => {
    interceptTemplatePatch('template-unsupported-unaccepted');
    interceptDashboardConfigPatch();

    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .findEnabledToggle()
      .click();
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
    servingRuntimeTemplates.getRowById('template-unsupported-accepted').shouldBeEnabled(true);

    servingRuntimeTemplates.getRowById('template-unsupported-accepted').findEnabledToggle().click();

    cy.wait('@patchDashboardConfig');
    unsupportedStatusAcceptanceModal.shouldNotExist();
  });

  it('should show limited support label on unsupported templates', () => {
    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .shouldHaveUnsupportedLabel(true);
    servingRuntimeTemplates
      .getRowById('template-unsupported-accepted')
      .shouldHaveUnsupportedLabel(true);
  });

  it('should not show limited support label on normal templates', () => {
    servingRuntimeTemplates.getRowById('template-1').shouldHaveUnsupportedLabel(false);
  });

  it('should show version label on templates with version annotation', () => {
    servingRuntimeTemplates
      .getRowById('template-unsupported-unaccepted')
      .findServingRuntimeVersionLabel()
      .should('have.text', '0.11.0+rhai5');
  });
});
