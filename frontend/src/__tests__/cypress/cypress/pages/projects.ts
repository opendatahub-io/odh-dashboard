import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { DeleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { K8sNameDescriptionField } from '#~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { TrustyAICRState } from '#~/__tests__/cypress/cypress/pages/components/TrustyAICRState';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

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
    return cy.findByTestId('image-display-name').should('contain.text', name);
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

  findNotebookStop() {
    return this.find().findByTestId('state-action-toggle');
  }
}

class ProjectRow extends TableRow {
  findDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findNotebookColumn() {
    return this.find().findByTestId('notebook-column-expand');
  }

  findNotebookColumnExpander() {
    return this.find().findByTestId('notebook-column-expand').find('button');
  }

  findNotebookTable() {
    return this.find().parents('tbody').findByTestId('project-notebooks-table');
  }

  getNotebookRows() {
    return this.findNotebookTable().findByTestId('project-notebooks-table-row');
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
    appChrome.findNavItem('Data science projects').click();
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

  findLaunchStandaloneWorkbenchButton() {
    return cy.findByTestId('launch-standalone-notebook-server');
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
    return cy.findByTestId('dashboard-empty-table-state');
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
    return this.findFooter().findByRole('button', { name: this.edit ? /Update/ : /Create/ });
  }

  findEditProjectName() {
    return this.find().findByTestId('manage-project-modal-name');
  }

  findEditDescriptionName() {
    return this.find().findByTestId('manage-project-modal-description');
  }
}

class ProjectDetails {
  visit(project: string, opts: { wait?: boolean } = { wait: true }) {
    cy.visitWithLogin(`/projects/${project}`);
    if (opts.wait) {
      this.wait();
    } else {
      cy.testA11y();
    }
  }

  visitSection(project: string, section: string, extraUrlParams = '') {
    cy.visitWithLogin(`/projects/${project}?section=${section}${extraUrlParams}`);
    this.wait(section);
  }

  findSectionTab(sectionId: string) {
    return cy.findByTestId(`${sectionId}-tab`);
  }

  private wait(section = 'overview') {
    cy.findByTestId(`section-${section}`);
    cy.testA11y();
  }

  findModelServingPlatform(name: string) {
    return this.findComponent('model-server').findByTestId(`${name}-platform-card`);
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

  findSelectPlatformButton(platform: string) {
    return cy.findByTestId(`${platform}-serving-select-button`);
  }

  findResetPlatformButton() {
    return cy.findByTestId('change-serving-platform-button');
  }

  findErrorSelectingPlatform() {
    return cy.findByTestId('error-selecting-serving-platform');
  }

  findDeployModelDropdown() {
    return cy.findByTestId('deploy-model-dropdown');
  }

  findBackToRegistryButton() {
    return cy.findByTestId('deploy-from-registry');
  }

  findTopLevelDeployModelButton() {
    return cy.findByTestId('deploy-button');
  }

  findTopLevelAddModelServerButton() {
    return cy.findByTestId('add-server-button');
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

  findPipelineTimeoutErrorMessage() {
    return cy.findByTestId('timeout-pipeline-error-message');
  }

  findKserveModelsTable() {
    return cy.findByTestId('kserve-inference-service-table');
  }

  getKserveModelMetricLink(name: string) {
    return this.findKserveModelsTable().findByTestId(`metrics-link-${name}`);
  }

  verifyProjectName(project: string) {
    return cy.get('[data-testid="app-page-title"]').should('contain.text', project);
  }

  verifyProjectDescription(description: string) {
    return cy.findByText(description);
  }

  findActions() {
    return cy.findByTestId('project-actions');
  }

  findDeleteProjectButton() {
    return cy.findByTestId('delete-project-action').find('button');
  }

  find403Page() {
    return cy.findByTestId('unauthorized-error');
  }

  getKserveTableRow(name: string) {
    return new KserveTableRow(() =>
      this.findKserveModelsTable()
        .find('tbody')
        .find('[data-label="Name"]')
        .contains(name)
        .closest('tr'),
    );
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

class ProjectDetailsOverviewTab extends ProjectDetails {
  visit(project: string) {
    super.visitSection(project, 'overview');
  }

  findDeployedModelServingRuntime(name: string) {
    return cy
      .findByTestId('section-overview')
      .get('div')
      .contains(name)
      .parents('.odh-type-bordered-card .model-server')
      .get('dd');
  }

  findModelServingPlatform(name: string) {
    return cy.findByTestId(`${name}-platform-card`);
  }
}

class KserveTableRow extends TableRow {
  findAPIProtocol() {
    return this.find().find(`[data-label="API protocol"]`);
  }

  findServiceRuntime() {
    return this.find().find(`[data-label="Serving Runtime"]`);
  }

  findDetailsTriggerButton() {
    return this.find().findByTestId('kserve-model-row-item').find('button');
  }

  private findDetailsCell() {
    return this.find().next('tr').find('td').eq(1);
  }

  findInfoValueFor(label: string) {
    return this.findDetailsCell().find('dt').contains(label).closest('div').find('dd');
  }
}

export const projectListPage = new ProjectListPage();
export const createProjectModal = new CreateEditProjectModal();
export const editProjectModal = new CreateEditProjectModal(true);
export const deleteProjectModal = new DeleteModal();
export const projectDetails = new ProjectDetails();
export const projectDetailsSettingsTab = new ProjectDetailsSettingsTab();
export const projectDetailsOverviewTab = new ProjectDetailsOverviewTab();
