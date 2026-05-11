const TOGGLEABLE_FLAGS = ['promptManagement', 'guardrails'];

const buildFeatureFlagParams = (featureFlags?: string[]): string => {
  if (!featureFlags) {
    return '';
  }
  const params = new URLSearchParams();
  for (const flag of featureFlags) {
    params.set(flag, 'true');
  }
  for (const flag of TOGGLEABLE_FLAGS) {
    if (!featureFlags.includes(flag)) {
      params.set(flag, 'false');
    }
  }
  return params.toString();
};

export const appendFeatureFlagParams = (path: string): string => {
  const flagParams: string = Cypress.env('_featureFlagParams') || '';
  if (!flagParams) {
    return path;
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${flagParams}`;
};

class AppChrome {
  visit(featureFlags?: string[]): void {
    const flagParams = buildFeatureFlagParams(featureFlags);
    Cypress.env('_featureFlagParams', flagParams);
    cy.visit(appendFeatureFlagParams('/'));
    this.waitForPageLoad();
  }

  waitForPageLoad(): void {
    cy.document().should('exist');
    cy.get('body', { timeout: 15000 }).should('be.visible');
  }
}

export const appChrome = new AppChrome();
