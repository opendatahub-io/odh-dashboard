import { ApplicationLauncher } from './appLauncher';

class AppChrome {
  visit() {
    cy.visitWithLogin('/');
    this.wait();
  }

  private wait() {
    cy.get('#dashboard-page-main');
    cy.testA11y();
  }

  shouldBeUnauthorized() {
    cy.findByTestId('unauthorized-error');
    return this;
  }

  findNavToggle() {
    return cy.get('#page-nav-toggle');
  }

  findSideBar(options?: { timeout?: number }) {
    return cy.get('#page-sidebar', options);
  }

  findMainContent() {
    return cy.get('#dashboard-page-main');
  }

  findHelpButton() {
    return cy.get('#help-icon-toggle');
  }

  getApplicationLauncher() {
    return new ApplicationLauncher(() => cy.findByTestId('application-launcher'));
  }

  findNavSection(name: string) {
    return this.findSideBar().findByRole('button', { name });
  }

  findNavItem(args: { name: string; rootSection?: string; subSection?: string }) {
    return this.findSideBar().findAppNavItem(args);
  }

  findDarkThemeToggle() {
    return this.findColorSchemeToggle('Dark');
  }

  findLightThemeToggle() {
    return this.findColorSchemeToggle('Light');
  }

  findColorSchemeToggle(name: 'System' | 'Light' | 'Dark') {
    this.openAppearanceSwitcher();
    return cy.get('#theme-selector-color-scheme-title').parent().findByRole('button', { name });
  }

  findContrastModeToggle(name: 'System' | 'Default' | 'Glass' | 'High contrast') {
    this.openAppearanceSwitcher();
    return cy.get('#theme-selector-contrast-title').parent().findByRole('button', { name });
  }

  openAppearanceSettings() {
    this.openAppearanceSwitcher();
    return cy.get('#theme-selector-color-scheme-title').should('be.visible');
  }

  private openAppearanceSwitcher() {
    cy.findByTestId('appearance-settings-button').then(($btn) => {
      if ($btn.attr('aria-expanded') !== 'true') {
        cy.wrap($btn).click();
      }
    });
  }
}

export const appChrome = new AppChrome();
