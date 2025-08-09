import type { ContainerResources } from '#~/types';
import type { ProfileIdentifierType } from '#~/concepts/hardwareProfiles/types';
import { Contextual } from './Contextual';

class HardwareProfileGroup extends Contextual<HTMLElement> {}

export class HardwareProfileSection {
  findSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-select');
  }

  findHardwareProfileSearchSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-selection-toggle');
  }

  findHardwareProfileSearchInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return cy.findByTestId('hardware-profile-selection-search').find('input');
  }

  getGlobalHardwareProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Global hardware profiles');
  }

  getProjectScopedHardwareProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Project-scoped hardware profiles');
  }

  findDetails(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-details');
  }

  findProjectScopedLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-scoped-label');
  }

  findGlobalScopedLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('global-scoped-label');
  }

  findDetailsPopover(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-details-popover');
  }

  findCustomizeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-customize').findByRole('button', {
      name: 'Customize resource requests and limits',
    });
  }

  findCustomizeForm(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-customize-form');
  }

  findCPURequestsCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`cpu-requests-checkbox`);
  }

  findCPULimitsCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`cpu-limits-checkbox`);
  }

  findMemoryRequestsCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`memory-requests-checkbox`);
  }

  findMemoryLimitsCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`memory-limits-checkbox`);
  }

  findRequestsLimitsInfoButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('requests-limits-info-button');
  }

  findRequestsLimitsPopover(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog', { name: 'Requests and Limits' });
  }

  findResourceCheckbox(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
  ): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`${resourceType}-${type}-checkbox`);
  }

  findResourceUnit(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
  ): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findResourceCheckbox(resourceType, type)
      .closest('.pf-v6-l-stack')
      .findByTestId('value-unit-select');
  }

  selectProfile(name: string): void {
    this.findSelect().click();
    cy.findByRole('option', { name }).click();
  }

  selectPotentiallyDisabledProfile(profileDisplayName: string, profileName?: string): void {
    this.findSelect().then(($el) => {
      if ($el.prop('disabled')) {
        // If disabled, verify it contains the base profile name
        // Use the shorter profileName if provided, otherwise use profileDisplayName
        const nameToCheck = profileName || profileDisplayName;
        cy.wrap($el).contains(nameToCheck).should('exist');
        cy.log(`Dropdown is disabled with value: ${nameToCheck}`);
      } else {
        // If enabled, proceed with selection as before using the full display name
        this.findSelect().click();
        cy.findByRole('option', { name: profileDisplayName }).click();
      }
    });
  }

  getProjectScopedHardwareProfile(): Contextual<HTMLElement> {
    return new HardwareProfileGroup(() => cy.findByTestId('project-scoped-hardware-profiles'));
  }

  getGlobalScopedHardwareProfile(): Contextual<HTMLElement> {
    return new HardwareProfileGroup(() => cy.findByTestId('global-scoped-hardware-profiles'));
  }

  verifyProfileDetails(resources: ContainerResources): void {
    this.findDetailsPopover().click();
    this.findDetails().within(() => {
      const allKeys = new Set([
        ...Object.keys(resources.requests || {}),
        ...Object.keys(resources.limits || {}),
      ]);

      allKeys.forEach((key) => {
        const request = resources.requests?.[key]?.toString() || '';
        const limit = resources.limits?.[key]?.toString() || '';

        cy.contains(`Identifier: ${key}; Request: ${request}; Limit: ${limit}`).should('exist');
      });
    });
  }

  verifyResourceValidation(label: string, value: string, errorMessage?: string): void {
    this.findCustomizeForm().within(() => {
      cy.findByTestId(`${label}-input`).findByLabelText('Input').clear();
      cy.findByTestId(`${label}-input`).type(`{moveToEnd}${value}`, { delay: 100 });
      if (errorMessage) {
        cy.findByText(errorMessage).should('exist');
      }
    });
  }

  verifyResourceValue(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
    value: string,
  ): void {
    this.verifyResourceValidation(`${resourceType}-${type}`, value);
  }

  setResourceValue(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
    value: string,
  ): void {
    this.verifyResourceValidation(`${resourceType}-${type}`, value);
  }

  verifyResourceCheckboxState(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
    checked: boolean,
    disabled?: boolean,
  ): void {
    this.findResourceCheckbox(resourceType, type)
      .should(checked ? 'be.checked' : 'not.be.checked')
      .then(($el) => {
        if (disabled !== undefined) {
          cy.wrap($el).should(disabled ? 'be.disabled' : 'not.be.disabled');
        }
      });
  }

  selectResourceUnit(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
    unit: 'Gi' | 'Mi' | 'Ki',
  ): void {
    this.findResourceUnit(resourceType, type).click();

    // Select the desired unit from the dropdown using the key
    cy.findByRole('menuitem', { name: `${unit}B` }).click();
  }

  verifyResourceUnit(
    resourceType: 'cpu' | 'memory',
    type: ProfileIdentifierType,
    expectedUnit: 'Gi' | 'Mi',
  ): void {
    this.findResourceUnit(resourceType, type).should('contain.text', expectedUnit);
  }
}

export const hardwareProfileSection = new HardwareProfileSection();
