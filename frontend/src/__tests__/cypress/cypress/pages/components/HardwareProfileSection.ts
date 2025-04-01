import type { ContainerResources } from '~/types';

export class HardwareProfileSection {
  findSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-select');
  }

  findDetails(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-details');
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
      cy.findByTestId(`${label}-input`).clear();
      cy.findByTestId(`${label}-input`).type(`{moveToEnd}${value}`, { delay: 100 });
      if (errorMessage) {
        cy.findByText(errorMessage).should('exist');
      } else {
        cy.findByText('Value must be').should('not.exist');
      }
    });
  }
}

export const hardwareProfileSection = new HardwareProfileSection();
