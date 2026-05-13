import { Modal } from './components/Modal';
import { appChrome } from './appChrome';
import { DeleteModal } from './components/DeleteModal';
import { Contextual } from './components/Contextual';
import { K8sNameDescriptionField } from './components/subComponents/K8sNameDescriptionField';
import { TrustyAICRState } from './components/TrustyAICRState';
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

  findNameFilter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-list-name-filter');
  }

  findUserFilter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-list-user-filter');
  }

  findProjectTypeDropdownToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-type-dropdown-toggle');
  }

  selectProjectType(projectType: string): void {
    this.findProjectTypeDropdownToggle().click();
    cy.findByRole('option', { name: new RegExp(projectType, 'i') }).click();
  }

  findAIProjectLabel() {
    return cy.findByTestId('ai-project-label');
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

class ProjectRow extends TableRow {
  findDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findAILabel() {
    return this.find().findByTestId('ai-project-label');
  }
}

class ProjectListPage {
  visit() {
    cy.visitWithLogin('/projects');
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Projects' }).click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title', { timeout: 15000 }).should('be.visible');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
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
    cy.findByTestId('no-project').should('exist');
    return this;
  }

  findCreateProjectButton() {
    return cy.findByTestId('create-project');
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

  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
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
   * Filter Project by name using the Project filter from the Projects view
   * @param projectName Project Name
   */
  filterProjectByName = (projectName: string) => {
    cy.findByTestId('projects-table-toolbar', { timeout: 30000 }).should('be.visible');
    const projectListToolbar = projectListPage.getTableToolbar();
    projectListToolbar.findNameFilter().type(projectName);
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

  findModelServingTab() {
    return this.findSectionTab('model-server');
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

  findImportPipelineButton(timeout = 60000) {
    return cy.findByTestId('import-pipeline-button', { timeout });
  }

  /**
   * Checks if the Import Pipeline button exists in the DOM.
   * Useful after DSPA is ready to determine if page reload is needed.
   */
  private importPipelineButtonExists(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      const button = $body.find('[data-testid="import-pipeline-button"]');
      return button.length > 0;
    });
  }

  /**
   * Ensures the Import Pipeline button is loaded, reloading the page once if needed.
   * Should be called after DSPA is confirmed ready.
   */
  ensureImportPipelineButtonLoaded() {
    return this.importPipelineButtonExists().then((exists) => {
      if (!exists) {
        cy.log('Import Pipeline button not found, reloading page once');
        cy.reload();
      }
    });
  }

  findSelectPlatformButton(platform: string) {
    return cy.findByTestId(`${platform}-select-button`);
  }

  findResetPlatformButton() {
    return cy.findByTestId('change-serving-platform-button');
  }

  findErrorSelectingPlatform() {
    return cy.findByTestId('error-selecting-serving-platform');
  }

  findTopLevelDeployModelButton() {
    return cy.findByTestId('deploy-button');
  }

  findTopLevelAddModelServerButton() {
    return cy.findByTestId('add-server-button');
  }

  findDeployModelTooltip() {
    return cy.findByTestId('deploy-model-tooltip');
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
    return cy.findByTestId('deployments-table');
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

  findSelectPlatformButton(name: string) {
    return cy.findByTestId(`${name}-select-button`);
  }

  findDeployedModelCard(modelName: string) {
    return cy.findByTestId(`deployed-model-card-${modelName}`);
  }

  findCardServingRuntime(modelName: string) {
    return this.findDeployedModelCard(modelName).findByTestId('overview-card-serving-runtime');
  }
}

class KserveTableRow extends TableRow {
  findAPIProtocol() {
    return this.find().find(`[data-label="API protocol"]`);
  }

  findServiceRuntime() {
    return this.find().find(`[data-label="Deployment resource"]`);
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
