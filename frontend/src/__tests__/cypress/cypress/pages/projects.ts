import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { TableRow } from './components/table';

class NotebookRow extends TableRow {
  findNotebookImageAvailability() {
    return cy.findByTestId('notebook-image-availability');
  }

  shouldHaveNotebookImageName(name: string) {
    return cy.findByTestId('image-display-name').should('have.text', name);
  }
}

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

  shouldHaveDSLabel(projectName: string) {
    return this.findProjectRow(projectName).findByText('DS').should('exist');
  }

  findProjectsTable() {
    return cy.get('[data-id=project-view-table]');
  }

  findProjectRow(projectName: string) {
    return this.findProjectLink(projectName).parents('tr');
  }

  findProjectLink(projectName: string) {
    return this.findProjectsTable().findByRole('link', { name: projectName });
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

  private findModelServingPlatform(name: string) {
    return this.findComponent('model-server').findByTestId(`${name}-serving-platform-card`);
  }

  findSingleModelDeployButton() {
    return this.findModelServingPlatform('single').findByTestId('model-serving-platform-button');
  }

  findMultiModelButton() {
    return this.findModelServingPlatform('multi').findByTestId('model-serving-platform-button');
  }

  findDeployModelTooltip() {
    return cy.findByTestId('model-serving-action-tooltip');
  }

  shouldHaveNoPlatformSelectedText() {
    cy.findByTestId('no-model-serving-platform-selected').should('exist');
    return this;
  }

  findServingPlatformLabel() {
    return cy.findByTestId('serving-platform-label');
  }

  findComponent(componentName: string) {
    return cy.findByTestId(`section-${componentName}`);
  }

  shouldBeEmptyState(componentName: string, emptyState: boolean) {
    this.findComponent(componentName)
      .findByTestId('empty-state-title')
      .should(emptyState ? 'exist' : 'not.exist');
    return this;
  }

  shouldDivide() {
    cy.findAllByTestId('details-page-section').then((sections) => {
      cy.wrap(sections)
        .find('.odh-details-section--divide')
        .should('have.length', sections.length - 1);
    });
    return this;
  }

  private findTable() {
    return cy.findByTestId('notebook-image');
  }

  getNotebookRow(name: string) {
    return new NotebookRow(() =>
      this.findTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findTab(name: string) {
    return cy.findByRole('tab', { name });
  }
}

class ProjectDetailsSettingsTab extends ProjectDetails {
  visit(project: string) {
    super.visit(project);
    this.findTab('Settings').click();

    this.findTrustyAIInstallCheckbox();
    cy.testA11y();
  }

  findTrustyAIInstallCheckbox() {
    return cy.findByTestId('trustyai-service-installation');
  }

  getTrustyAIUninstallModal() {
    return new TrustyAIUninstallModal();
  }

  findTrustyAITimeoutError() {
    return cy.findByTestId('trustyai-service-timeout-error');
  }

  findTrustyAIServiceError() {
    return cy.findByTestId('trustyai-service-error');
  }

  findTrustyAISuccessAlert() {
    return cy.findByTestId('trustyai-service-installed-alert');
  }
}

class TrustyAIUninstallModal extends DeleteModal {
  constructor() {
    super('Warning alert: Uninstall TrustyAI');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Uninstall' });
  }
}

export const projectListPage = new ProjectListPage();
export const createProjectModal = new CreateEditProjectModal();
export const editProjectModal = new CreateEditProjectModal(true);
export const deleteProjectModal = new DeleteModal();
export const projectDetails = new ProjectDetails();
export const projectDetailsSettingsTab = new ProjectDetailsSettingsTab();
