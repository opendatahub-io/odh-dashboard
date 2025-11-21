import type { ContainerResources } from '@odh-dashboard/internal/types';
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

  findCPURequestsInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findCustomizeForm().findByTestId('cpu-requests-input').findByLabelText('Input');
  }

  findCPULimitsInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findCustomizeForm().findByTestId('cpu-limits-input').find('input');
  }

  findMemoryRequestsInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findCustomizeForm().findByTestId('memory-requests-input').find('input');
  }

  findMemoryLimitsInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findCustomizeForm().findByTestId('memory-limits-input').find('input');
  }

  selectProfile(name: string): void {
    this.findSelect().click();
    cy.findByRole('option', { name }).click();
  }

  selectPotentiallyDisabledProfile(profileDisplayName: string, profileName?: string): void {
    const dropdown = this.findSelect();

    dropdown.then(($el) => {
      if ($el.prop('disabled')) {
        // If disabled, verify it contains the base profile name
        // Use the shorter profileName if provided, otherwise use profileDisplayName
        const nameToCheck = profileName || profileDisplayName;
        cy.wrap($el).contains(nameToCheck).should('exist');
        cy.log(`Dropdown is disabled with value: ${nameToCheck}`);
      } else {
        // If enabled, proceed with selection as before using the full display name
        dropdown.click();
        cy.findByRole('option', { name: profileDisplayName }).click();
      }
    });
  }

  selectProfileContaining(name: string): void {
    cy.findByRole('option', {
      name: (content) => content.includes(name),
    }).click();
  }

  getProjectScopedHardwareProfile(): Contextual<HTMLElement> {
    return new HardwareProfileGroup(() => cy.findByTestId('project-scoped-hardware-profiles'));
  }

  getGlobalScopedHardwareProfile(): Contextual<HTMLElement> {
    return new HardwareProfileGroup(() => cy.findByTestId('global-scoped-hardware-profiles'));
  }

  selectGlobalScopedProfile(profileName: string | RegExp): void {
    this.getGlobalScopedHardwareProfile()
      .find()
      .findByRole('menuitem', {
        name: profileName,
        hidden: true,
      })
      .click();
  }

  selectProjectScopedProfile(profileName: string | RegExp): void {
    this.getProjectScopedHardwareProfile()
      .find()
      .findByRole('menuitem', {
        name: profileName,
        hidden: true,
      })
      .click();
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
}

export const hardwareProfileSection = new HardwareProfileSection();
