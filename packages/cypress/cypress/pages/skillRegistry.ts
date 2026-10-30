import { appChrome } from './appChrome';
import { SearchSelector } from './components/subComponents/SearchSelector';

const SKILL_REGISTRY_PATH = '/ai-hub/skills';

class SkillRegistry {
  projectDropdown = new SearchSelector('project-selector');

  visit(workspace?: string, wait = true) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`${SKILL_REGISTRY_PATH}${qs}`);
    if (wait) {
      this.wait();
    }
  }

  visitSkill(skillPath: string, params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    cy.visitWithLogin(`${SKILL_REGISTRY_PATH}/${skillPath}${qs ? `?${qs}` : ''}`);
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  shouldHaveSkillRegistryUrl() {
    cy.url().should('include', SKILL_REGISTRY_PATH).should('include', 'workspace=');
  }

  shouldHaveWorkspace(workspace: string) {
    cy.url().should('include', SKILL_REGISTRY_PATH).should('include', `workspace=${workspace}`);
  }

  selectProjectFromNotFoundState(name: string) {
    cy.findAllByTestId('project-selector-toggle').last().click();
    this.projectDropdown.searchItem(name);
    this.projectDropdown.selectItem(name, true);
  }

  shouldHaveSkillPath(skillPath: string) {
    cy.location('pathname').should('eq', `${SKILL_REGISTRY_PATH}/${skillPath}`);
  }

  shouldHaveQueryParam(name: string, value: string) {
    cy.location('search').should('include', `${name}=${value}`);
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
