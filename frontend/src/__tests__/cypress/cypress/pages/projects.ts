import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

class ProjectListPage {
  visit() {
    cy.visitWithLogin('/projects');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Data Science Projects').click();
    this.wait();
  }

  private wait() {
    cy.findByText('View your existing projects or create new projects.');
    cy.testA11y();
  }

  shouldHaveProjects() {
    this.findProjectsTable().should('exist');
    return this;
  }

  shouldBeEmpty() {
    cy.findByText('No data science projects yet.').should('exist');
    return this;
  }

  findCreateProjectButton() {
    return cy.findByRole('button', { name: 'Create data science project' });
  }

  findProjectsTable() {
    return cy.get('[data-id=project-view-table]');
  }

  findProjectRow(projectName: string) {
    return this.findProjectsTable().findByRole('link', { name: projectName }).parents('tr');
  }
}

class CreateEditProjectModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Create'} data science project`);
  }

  findNameInput() {
    return this.find().findByLabelText('Name *');
  }

  findResourceNameInput() {
    return this.find().findByLabelText('Resource name *');
  }

  findDescriptionInput() {
    return this.find().findByLabelText('Description');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: this.edit ? /Edit/ : /Create/ });
  }
}

class ProjectDetails {
  visit(project: string) {
    cy.visit(`/projects/${project}`);
    this.wait();
  }

  private wait() {
    cy.findByRole('tab', { name: 'Components' });
    cy.testA11y();
  }
}

export const projectListPage = new ProjectListPage();
export const createProjectModal = new CreateEditProjectModal();
export const editProjectModal = new CreateEditProjectModal(true);
export const deleteProjectModal = new DeleteModal();
export const projectDetails = new ProjectDetails();
