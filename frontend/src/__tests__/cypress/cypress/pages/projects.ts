import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class ProjectListPage {
  visit() {
    cy.visitWithLogin('/projects');
  }

  navigate() {
    appChrome.selectNavItem('Data Science Projects').click();
  }

  wait() {
    cy.findByText('View your existing projects or create new projects.', { timeout: 10000 });
  }

  shouldHaveProjects() {
    this.selectProjectsTable().should('exist');
  }

  shouldBeEmpty() {
    cy.findByText('No data science projects yet.').should('exist');
  }

  selectCreateProjectButton() {
    return cy.findByRole('button', { name: 'Create data science project' });
  }

  selectProjectsTable() {
    return cy.get('[data-id=project-view-table]');
  }

  selectProjectRow(projectName: string) {
    return this.selectProjectsTable().findByRole('link', { name: projectName }).parents('tr');
  }

  selectProjectActions(projectName: string) {
    return this.selectProjectRow(projectName).findKebab();
  }

  selectDeleteAction() {
    return cy.findKebabAction('Delete project');
  }
}

class CreateEditProjectModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Create'} data science project`);
  }

  selectNameInput() {
    return this.selectModal().findByLabelText('Name *');
  }

  selectResourceNameInput() {
    return this.selectModal().findByLabelText('Resource name *');
  }

  selectDescriptionInput() {
    return this.selectModal().findByLabelText('Description');
  }

  selectSubmitButton() {
    return this.selectFooter().findByRole('button', { name: this.edit ? /Edit/ : /Create/ });
  }

  selectCancelButton() {
    return this.selectFooter().findByRole('button', { name: 'Cancel' });
  }
}

export const projectListPage = new ProjectListPage();
export const createProjectModal = new CreateEditProjectModal();
export const editProjectModal = new CreateEditProjectModal(true);
export const deleteProjectModal = deleteModal;
