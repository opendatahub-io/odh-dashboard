class SkillRegistry {
  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`/ai-hub/skills/registry${qs}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-tab-page-title', { timeout: 30000 }).should('exist');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-tab-page-title');
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findNoProjectsEmptyState() {
    return cy.findByTestId('skill-registry-no-projects-empty-state');
  }

  findInvalidProjectState() {
    return cy.findByTestId('empty-state-title');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle', { timeout: 30000 });
  }

  findProjectInDropdown(name: string) {
    return cy.findByRole('menuitem', { name });
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url().should('include', `workspace=${workspace}`);
  }
}

export const skillRegistry = new SkillRegistry();
