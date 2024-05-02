import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { TableRow } from './components/table';
import { TableToolbar } from './components/TableToolbar';

class ProjectListToolbar extends TableToolbar {}
class NotebookRow extends TableRow {
  findNotebookImageAvailability() {
    return cy.findByTestId('notebook-image-availability');
  }

  shouldHaveNotebookImageName(name: string) {
    return cy.findByTestId('image-display-name').should('have.text', name);
  }

  findOutdatedElyraInfo() {
    return cy.findByTestId('outdated-elyra-info');
  }
}

class ProjectRow extends TableRow {
  shouldHaveProjectIcon() {
    return this.find().findByTestId('ds-project-image').should('exist');
  }

  findEnableSwitch() {
    return this.find().pfSwitch('notebook-status-switch');
  }

  findNotebookRouteLink() {
    return this.find().findByTestId('notebook-route-link');
  }

  findNotebookStatusText() {
    return this.find().findByTestId('notebook-status-text');
  }
}

class ProjectListPage {
  visit() {
    cy.visit('/projects');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Data Science Projects').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  shouldHaveProjects() {
    this.findProjectsTable().should('exist');
    return this;
  }

  shouldReturnNotFound() {
    cy.findByTestId('not-found-page').should('exist');
    return this;
  }

  shouldBeEmpty() {
    cy.findByTestId('no-data-science-project').should('exist');
    return this;
  }

  findCreateProjectButton() {
    return cy.findByTestId('create-data-science-project');
  }

  findProjectsTable() {
    return cy.findByTestId('project-view-table');
  }

  getProjectRow(projectName: string) {
    return new ProjectRow(() => this.findProjectLink(projectName).parents('tr'));
  }

  findProjectLink(projectName: string) {
    return this.findProjectsTable().findByRole('link', { name: projectName });
  }

  findEmptyResults() {
    return cy.findByTestId('no-result-found-title');
  }

  findSortButton(name: string) {
    return this.findProjectsTable().find('thead').findByRole('button', { name });
  }

  getTableToolbar() {
    return new ProjectListToolbar(() => cy.findByTestId('dashboard-table-toolbar'));
  }

  findCreateWorkbenchButton() {
    return cy.findByRole('button', { name: 'Create a workbench' });
  }
}

class CreateEditProjectModal extends Modal {
  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Create'} data science project`);
  }

  findNameInput() {
    return this.find().findByTestId('manage-project-modal-name');
  }

  findResourceNameInput() {
    return this.find().findByTestId('resource-manage-project-modal-name');
  }

  findDescriptionInput() {
    return this.find().findByTestId('manage-project-modal-description');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: this.edit ? /Edit/ : /Create/ });
  }
}

class DataConnectionRow extends TableRow {
  findWorkbenchConnection() {
    return this.find().find(`[data-label="Connected workbenches"]`);
  }
}

class ProjectDetails {
  visit(project: string) {
    cy.visit(`/projects/${project}`);
    this.wait();
  }

  visitSection(project: string, section: string) {
    cy.visit(`/projects/${project}?section=${section}`);
    this.wait(section);
  }

  private wait(section = 'overview') {
    cy.findByTestId(`section-${section}`);
    cy.testA11y();
  }

  findSortButton(name: string) {
    return this.findDataConnectionTable().find('thead').findByRole('button', { name });
  }

  private findModelServingPlatform(name: string) {
    return this.findComponent('model-server').findByTestId(`${name}-serving-platform-card`);
  }

  private findDataConnectionTable() {
    return cy.findByTestId('data-connection-table');
  }

  getDataConnectionRow(name: string) {
    return new DataConnectionRow(() =>
      this.findDataConnectionTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findSingleModelDeployButton() {
    return this.findModelServingPlatform('single').findByTestId('single-serving-deploy-button');
  }

  findMultiModelButton() {
    return this.findModelServingPlatform('multi').findByTestId('multi-serving-add-server-button');
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

  shouldBeEmptyState(tabName: string, componentName: string, emptyState: boolean) {
    this.findTab(tabName).click();
    this.findComponent(componentName)
      .findByTestId('empty-state-title')
      .should(emptyState ? 'exist' : 'not.exist');
    return this;
  }

  findAddDataConnectionButton() {
    return cy.findByTestId('add-data-connection-button');
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

  findElyraInvalidVersionAlert() {
    return cy.findByTestId('elyra-invalid-version-alert');
  }

  findUnsupportedPipelineVersionAlert() {
    return cy.findByTestId('unsupported-pipeline-version-alert');
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
