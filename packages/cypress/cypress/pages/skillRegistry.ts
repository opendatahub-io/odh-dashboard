import { appChrome } from './appChrome';
import { SearchSelector } from './components/subComponents/SearchSelector';

const SKILL_REGISTRY_PATH = '/ai-hub/skills';

class SkillRegistry {
  projectDropdown = new SearchSelector('project-selector');

  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`${SKILL_REGISTRY_PATH}${qs}`);
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title', { timeout: 30000 }).should('exist');
    cy.testA11y();
  }

  shouldHaveSkillRegistryUrl() {
    cy.url().should('include', SKILL_REGISTRY_PATH).should('include', 'workspace=');
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url().should('include', SKILL_REGISTRY_PATH).should('include', `workspace=${workspace}`);
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Skills',
      rootSection: 'AI hub',
    });
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findPageDescription() {
    return cy.findByTestId('app-page-description');
  }

  findLaunchMlflowButton() {
    return cy.findByTestId('mlflow-skills-jump-link');
  }

  findNoProjectsEmptyState() {
    return cy.findByTestId('skill-registry-no-projects-empty-state');
  }

  findErrorEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findNotConfiguredEmptyState() {
    return cy.findByTestId('mlflow-not-configured-empty-state');
  }

  findNotConfiguredAdminEmptyState() {
    return cy.findByTestId('mlflow-not-configured-admin-empty-state');
  }

  findNotConfiguredAdminLink() {
    return cy.findByTestId('mlflow-not-configured-admin-link');
  }
}

export const skillRegistry = new SkillRegistry();
