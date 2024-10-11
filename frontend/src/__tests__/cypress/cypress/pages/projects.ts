import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';
import { K8sNameDescriptionField } from '~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { TrustyAICRState } from '~/__tests__/cypress/cypress/pages/components/TrustyAICRState';
import { TableRow } from './components/table';

class ProjectListToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findFilterInput(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText(`Filter by ${name}`);
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

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

class ProjectNotebookRow extends TableRow {
  findNotebookRouteLink() {
    return this.find().findByTestId('notebook-route-link');
  }

  findNotebookStatusText() {
    return this.find().findByTestId('notebook-status-text');
  }
}

class ProjectRow extends TableRow {
  findDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findNotebookColumn() {
    return this.find().findByTestId('notebook-column-expand');
  }

  findNotebookTable() {
    return this.find().parents('tbody').findByTestId('project-notebooks-table');
  }

  getNotebookRow(notebookName: string) {
    return new ProjectNotebookRow(() => this.findNotebookLink(notebookName).parents('tr'));
  }

  findNotebookLink(notebookName: string) {
    return this.findNotebookTable().findByRole('link', { name: notebookName });
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
    return new ProjectListToolbar(() => cy.findByTestId('projects-table-toolbar'));
  }

  findCreateWorkbenchButton() {
    return cy.findByRole('button', { name: 'Create a workbench' });
  }

  /**
   * Filter Project by name using the Project filter from the Data Science Projects view
   * @param projectName Project Name
   */
  filterProjectByName = (projectName: string) => {
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
    projectListToolbar.findSearchInput().type(projectName);
  };
}

class CreateEditProjectModal extends Modal {
  k8sNameDescription = new K8sNameDescriptionField('manage-project-modal');

  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Create'} project`);
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
    cy.visitWithLogin(`/projects/${project}`);
    this.wait();
  }

  visitSection(project: string, section: string) {
    cy.visitWithLogin(`/projects/${project}?section=${section}`);
    this.wait(section);
  }

  findSectionTab(sectionId: string) {
    return cy.findByTestId(`${sectionId}-tab`);
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

  showProjectResourceDetails() {
    return cy.findByTestId('resource-name-icon-button').click();
  }

  findProjectResourceNameText() {
    return cy.findByTestId('resource-name-text');
  }

  findProjectResourceKindText() {
    return cy.findByTestId('resource-kind-text');
  }

  findProjectActions() {
    return cy.findByTestId('project-actions');
  }

  showProjectActions() {
    cy.findByTestId('project-actions').click();
  }

  findEditProjectAction() {
    return cy.findByTestId('edit-project-action');
  }

  findDeleteProjectAction() {
    return cy.findByTestId('delete-project-action');
  }

  findImportPipelineButton(timeout?: number) {
    return cy.findByTestId('import-pipeline-button', { timeout });
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

  private findKserveModelsTable() {
    return cy.findByTestId('kserve-inference-service-table');
  }

  getKserveModelMetricLink(name: string) {
    return this.findKserveModelsTable().findByTestId(`metrics-link-${name}`);
  }
}

class ProjectDetailsSettingsTab extends ProjectDetails {
  trustyai = new TrustyAICRState();

  visit(project: string) {
    super.visit(project);
    this.findTab('Settings').click();
    cy.testA11y();
  }
}

export const projectListPage = new ProjectListPage();
export const createProjectModal = new CreateEditProjectModal();
export const editProjectModal = new CreateEditProjectModal(true);
export const deleteProjectModal = new DeleteModal();
export const projectDetails = new ProjectDetails();
export const projectDetailsSettingsTab = new ProjectDetailsSettingsTab();
