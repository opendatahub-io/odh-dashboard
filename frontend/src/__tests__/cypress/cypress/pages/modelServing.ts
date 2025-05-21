import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { mixin } from '~/__tests__/cypress/cypress/utils/mixin';
import { K8sNameDescriptionField } from '~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { Contextual } from './components/Contextual';

class ModelServingToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}
class ModelServingGlobal {
  visit(project?: string) {
    cy.visitWithLogin(`/modelServing${project ? `/${project}` : ''}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model deployments').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Model deployments');
    cy.testA11y();
  }

  shouldBeEmpty() {
    cy.findByTestId('empty-state-title').should('exist');
    return this;
  }

  shouldWaitAndCancel() {
    cy.findAllByTestId('loading-empty-state');
    this.findCancelButton().click();
  }

  private findCancelButton() {
    return cy.findByTestId('empty-state-cancel-button');
  }

  findSelectAProjectButton() {
    return cy.findByRole('button', { name: 'Select a project' });
  }

  findDeployModelButton() {
    return cy.findByTestId('deploy-button');
  }

  findNoProjectSelectedTooltip() {
    return cy.findByTestId('deploy-model-tooltip');
  }

  findGoToProjectButton() {
    return cy.findByTestId('empty-state-action-button');
  }

  findSingleServingModelButton() {
    return cy.findByTestId('single-serving-select-button');
  }

  findMultiModelButton() {
    return cy.findByTestId('multi-serving-select-button');
  }

  private findModelsTable() {
    // TODO be more precise
    return cy.findByTestId('inference-service-table');
  }

  getModelRow(name: string) {
    return this.findModelsTable().find(`[data-label=Name]`).contains(name).parents('tr');
  }

  findRows() {
    return this.findModelsTable().find('[data-label=Name]').parents('tr');
  }

  getModelMetricLink(name: string) {
    return this.findModelsTable().findByTestId(`metrics-link-${name}`);
  }

  findStatusTooltip() {
    return cy.findByTestId('status-tooltip');
  }

  findEmptyResults() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findSortButton(name: string) {
    return this.findModelsTable().find('thead').findByRole('button', { name });
  }

  getTableToolbar() {
    return new ModelServingToolbar(() => cy.findByTestId('model-serving-table-toolbar'));
  }

  findServingRuntime(name: string) {
    return this.findModelsTable().find(`[data-label=Serving Runtime]`).contains(name);
  }

  findServingRuntimeVersionLabel() {
    return cy.findByTestId('serving-runtime-version-label');
  }
}

class ServingRuntimeGroup extends Contextual<HTMLElement> {}

class InferenceServiceModal extends Modal {
  k8sNameDescription = new K8sNameDescriptionField('inference-service');

  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Deploy'} model`);
  }

  findConnectionType(name: string | RegExp) {
    return this.findExistingConnectionSelect()
      .findByRole('button', { name: 'Typeahead menu toggle' })
      .findSelectOption(name);
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findModelNameInput() {
    return this.k8sNameDescription.findDisplayNameInput();
  }

  findSpinner() {
    return this.find().findByTestId('spinner');
  }

  findServingRuntimeSelect() {
    return this.find().findByTestId('inference-service-model-selection');
  }

  findServingRuntimeTemplateSearchSelector() {
    return this.find().findByTestId('serving-runtime-template-selection-toggle');
  }

  findServingRuntimeTemplateSearchInput() {
    return cy.findByTestId('serving-runtime-template-selection-search').find('input');
  }

  getGlobalServingRuntimesLabel() {
    return cy.get('body').contains('Global serving runtimes');
  }

  getProjectScopedServingRuntimesLabel() {
    return cy.get('body').contains('Project-scoped serving runtimes');
  }

  findProjectScopedLabel() {
    return this.find().findByTestId('project-scoped-label');
  }

  findGlobalScopedLabel() {
    return this.find().findByTestId('global-scoped-label');
  }

  getProjectScopedServingRuntime() {
    return new ServingRuntimeGroup(() => cy.findByTestId('project-scoped-serving-runtimes'));
  }

  getGlobalScopedServingRuntime() {
    return new ServingRuntimeGroup(() => cy.findByTestId('global-scoped-serving-runtimes'));
  }

  findServingRuntimeTemplate() {
    return this.find().findByTestId('serving-runtime-template-selection');
  }

  findCalkitStandaloneServingRuntime() {
    return this.find().findByTestId('caikit-standalone-runtime');
  }

  findCalkitTGISServingRuntime() {
    return this.find().findByTestId('caikit-tgis-runtime');
  }

  findOpenVinoServingRuntime() {
    return this.find().findByTestId('kserve-ovms');
  }

  findModelFrameworkSelect() {
    return this.find().findByTestId('inference-service-framework-selection');
  }

  findOpenVinoIROpSet1() {
    return this.find().findByTestId('openvino_ir - opset1');
  }

  findOpenVinoIROpSet13() {
    return this.find().findByTestId('openvino_ir - opset13');
  }

  findOpenVinoOnnx() {
    return this.find().findByTestId('onnx - 1');
  }

  findDeploymentModeSelect() {
    return this.find().findByTestId('deployment-mode-select');
  }

  findDeployedModelRouteCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-route');
  }

  findTokenAuthenticationCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-auth');
  }

  findExistingUriOption() {
    return this.find().findByTestId('existing-uri-radio');
  }

  findNewConnectionOption() {
    return this.find().findByTestId('new-connection-radio');
  }

  findExistingConnectionOption() {
    return this.find().findByTestId('existing-connection-radio');
  }

  findExternalRouteError() {
    return this.find().findByTestId('external-route-no-token-alert');
  }

  findServiceAccountNameInput() {
    return this.find().findByTestId('service-account-form-name');
  }

  findExistingConnectionSelect() {
    return this.find().findByTestId('typeahead-menu-toggle');
  }

  findExistingConnectionSelectValueField() {
    return this.findExistingConnectionSelect().findByRole('combobox', {
      name: 'Type to filter',
    });
  }

  findHardProfileSelection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-select');
  }

  selectProfile(name: string): void {
    this.findHardProfileSelection().click();
    cy.findByRole('option', { name }).click();
  }

  selectPotentiallyDisabledProfile(profileDisplayName: string, profileName?: string): void {
    const dropdown = this.findHardProfileSelection();

    dropdown.then(($el) => {
      if ($el.prop('disabled')) {
        // If disabled, verify it contains the base profile name
        // Use the shorter profileName if provided, otherwise use profileDisplayName
        const nameToCheck = profileName || profileDisplayName;
        cy.wrap($el).contains(nameToCheck).should('exist');
        cy.log(`Dropdown is disabled with value: ${nameToCheck}`);
      } else {
        // If enabled, proceed with selection as before using the full display name
        dropdown.click();
        cy.findByRole('option', { name: profileDisplayName }).click();
      }
    });
  }

  findModelURITextBox() {
    return this.find().findByTestId('model-uri');
  }

  selectConnectionType(name: string) {
    this.findExistingConnectionSelect().click();
    cy.findByRole('option', { name, hidden: true }).click();
  }

  selectExistingConnectionSelectOptionByResourceName() {
    this.find().findByText('Test Secret').click();
  }

  findConnectionNameInput() {
    return this.find().findByTestId('connection-name-desc-name');
  }

  findConnectionFieldInput(envVar: string) {
    return this.find().findByTestId(`field ${envVar}`);
  }

  verifyPullSecretCheckbox() {
    return this.find()
      .get('.pf-v6-c-menu')
      .contains('Pull secret')
      .parent()
      .find('input[type="checkbox"]')
      .should('be.checked');
  }

  findOCIModelURI() {
    return this.find().findByTestId('model-uri');
  }

  findLocationNameInput() {
    return this.find().findByTestId('field Name');
  }

  findLocationAccessKeyInput() {
    return this.find().findByTestId('field AWS_ACCESS_KEY_ID');
  }

  findLocationSecretKeyInput() {
    return this.find().findByTestId('field AWS_SECRET_ACCESS_KEY');
  }

  findLocationEndpointInput() {
    return this.find().findByTestId('field AWS_S3_ENDPOINT');
  }

  findLocationBucketInput() {
    return this.find().findByTestId('field AWS_S3_BUCKET');
  }

  findBaseURL() {
    return this.find().findByTestId('field OCI_HOST');
  }

  findLocationRegionInput() {
    return this.find().findByTestId('field AWS_DEFAULT_REGION');
  }

  findLocationPathInput() {
    return this.find().findByTestId('folder-path');
  }

  findLocationPathInputError() {
    return this.find().findByTestId('folder-path-error');
  }

  findConfigurationParamsSection() {
    return this.find().findByTestId('configuration-params');
  }

  findServingRuntimeArgumentsSectionInput() {
    return this.find().findByTestId('serving-runtime-arguments-input');
  }

  findServingRuntimeEnvVarsSectionAddButton() {
    return this.find().findByTestId('add-environment-variable');
  }

  findServingRuntimeEnvVarsName(key: string) {
    return this.find().findByTestId(`serving-runtime-environment-variables-input-name ${key}`);
  }

  findServingRuntimeEnvVarsValue(value: string) {
    return this.find().findByTestId(`serving-runtime-environment-variables-input-value ${value}`);
  }

  findCreatedModel(name: string) {
    return this.find().findByTestId(`metrics-link-${name}`);
  }
}

class ServingRuntimeModal extends Modal {
  k8sNameDescription = new K8sNameDescriptionField('serving-runtime');

  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Add'} model server`);
  }

  findAuthorinoNotEnabledAlert() {
    return this.find().findByTestId('no-authorino-installed-alert');
  }

  findTokenAuthAlert() {
    return this.find().findByTestId('token-authentication-prerequisite-alert');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findModelServerSizeValue() {
    return this.find().findByLabelText('Model server size');
  }

  findServingRuntimeTemplateHelptext() {
    return this.find().findByTestId('serving-runtime-template-helptext');
  }

  findServingRuntimeTemplateDropdown() {
    return this.find().findByTestId('serving-runtime-template-selection');
  }

  findOpenVinoModelServer() {
    return this.find().findByTestId('ovms');
  }

  findPredefinedArgsButton() {
    return this.find().findByTestId('view-predefined-args-button');
  }

  findPredefinedArgsList() {
    return cy.findByTestId('predefined-args-list');
  }

  findPredefinedArgsTooltip() {
    return cy.findByTestId('predefined-args-tooltip');
  }

  findPredefinedVarsButton() {
    return this.find().findByTestId('view-predefined-vars-button');
  }

  findPredefinedVarsList() {
    return cy.findByTestId('predefined-vars-list');
  }

  findPredefinedVarsTooltip() {
    return cy.findByTestId('predefined-vars-tooltip');
  }

  findAuthenticationSection() {
    return this.find().findByTestId('auth-section');
  }

  findModelRouteCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-route');
  }

  findAuthenticationCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-auth');
  }

  findExternalRouteError() {
    return this.find().findByTestId('external-route-no-token-alert');
  }

  findServiceAccountNameInput() {
    return this.find().findByTestId('service-account-form-name');
  }

  findModelServerName() {
    return this.find().findByTestId('serving-runtime-name');
  }

  findModelServerSizeSelect() {
    return this.find().findByTestId('model-server-size-selection');
  }

  findDeployedModelRouteCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-route');
  }

  findTokenAuthenticationCheckbox() {
    return this.find().findByTestId('alt-form-checkbox-auth');
  }

  findModelServerReplicasMinusButton() {
    return this.find()
      .findByTestId('model-server-replicas')
      .findByRole('button', { name: 'Minus' });
  }

  findModelServerReplicasPlusButton() {
    return this.find().findByTestId('model-server-replicas').findByRole('button', { name: 'Plus' });
  }
}

// Expect KServeModal to inherit both modal classes.

// @ts-expect-error multiple inheritance hack
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface KServeModal extends ServingRuntimeModal, InferenceServiceModal {}
// @ts-expect-error multiple inheritance hack
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class KServeModal extends InferenceServiceModal {
  constructor(private edit = false) {
    super(edit);
  }
}
mixin(KServeModal, [ServingRuntimeModal, InferenceServiceModal]);

class ModelServingRow extends TableRow {
  shouldHaveServingRuntime(servingRuntime: string) {
    this.find().find('[data-label="Serving Runtime"]').contains(servingRuntime);
    return this;
  }

  shouldHaveTokens(enabled: boolean) {
    this.find()
      .find('[data-label="Tokens"]')
      .contains('Tokens disabled')
      .should(enabled ? 'not.exist' : 'exist');
    return this;
  }

  findInternalServiceButton() {
    return this.find().findByTestId('internal-service-button');
  }

  findInternalServicePopover() {
    return cy.findByTestId('internal-service-popover');
  }
}

class ModelMeshRow extends ModelServingRow {
  findExpandButton() {
    return this.find().find('[data-label="Model Server Name"] button');
  }

  findDeployModelButton() {
    return this.find().findByTestId('deploy-model-button');
  }

  findExpansion() {
    return this.find().siblings();
  }

  findDeployedModelExpansionButton() {
    return this.find().find('[data-label="Deployed models"] button');
  }
}

class KServeRow extends ModelMeshRow {
  findToggleButton() {
    return this.find().findByTestId('kserve-model-row-item').find('button');
  }

  findDescriptionListItem(itemName: string) {
    return this.find().next('tr').find(`dt:contains("${itemName}")`);
  }

  findProjectScopedLabel() {
    return this.find().findByTestId('project-scoped-label');
  }
}

class InferenceServiceRow extends TableRow {
  findStatusTooltip() {
    return this.find()
      .findByTestId('status-tooltip')
      .click()
      .then(() => {
        cy.findByTestId('model-status-tooltip');
      });
  }

  findStatusTooltipValue(msg: string) {
    this.findStatusTooltip()
      .invoke('text')
      .should('contain', msg)
      .then(() => {
        this.findStatusTooltip().find('button').click();
      });
  }

  findAPIProtocol() {
    return this.find().find(`[data-label="API protocol"]`);
  }

  findInternalServiceButton() {
    return this.find().findByTestId('internal-service-button');
  }

  findInternalServicePopover() {
    return cy.findByTestId('internal-service-popover');
  }

  findExternalServiceButton() {
    return this.find().findByTestId('internal-external-service-button');
  }

  findExternalServicePopover() {
    return cy.findByTestId('external-service-popover');
  }

  findServingRuntime() {
    return this.find().find(`[data-label="Serving Runtime"]`);
  }

  findProject() {
    return this.find().find(`[data-label=Project]`);
  }
}

class ModelServingSection {
  find() {
    return cy.findByTestId('section-model-server');
  }

  findDescriptionListItem(itemName: string) {
    return this.find().next('tr').find(`dt:contains("${itemName}")`);
  }

  private findKServeTable() {
    return this.find().findByTestId('kserve-inference-service-table');
  }

  private findModelMeshTable() {
    return this.find().findByTestId('serving-runtime-table');
  }

  findModelServerName(name: string) {
    return this.find().findByTestId(`metrics-link-${name}`);
  }

  findModelServer() {
    return this.find().findByTestId('model-server-name');
  }

  findHardwareSection() {
    return this.find().findByTestId('hardware-section');
  }

  findAcceleratorSection() {
    return this.find().findByTestId('accelerator-section');
  }

  findStatusTooltip() {
    return this.find().findByTestId('status-tooltip');
  }

  findKServeTableHeaderButton(name: string) {
    return this.findKServeTable().find('thead').findByRole('button', { name });
  }

  findInternalExternalServiceButton() {
    return this.find().findByTestId('internal-external-service-button');
  }

  findExternalServicePopoverTable() {
    return cy.findByTestId('external-service-popover');
  }

  getKServeRow(name: string) {
    return new KServeRow(() =>
      this.findKServeTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }

  findDeployModelButton() {
    return this.find().findByTestId('deploy-button');
  }

  findAddModelServerButton() {
    return this.find().findByTestId('add-server-button');
  }

  getModelMeshRow(name: string) {
    return new ModelMeshRow(() =>
      this.findModelMeshTable()
        .find('[data-label="Model Server Name"]')
        .contains(name)
        .parents('tr'),
    );
  }

  findInferenceServiceTable() {
    return cy.findByTestId('inference-service-table');
  }

  findInferenceServiceTableHeaderButton(name: string) {
    return this.findInferenceServiceTable().find('thead').findByRole('button', { name });
  }

  getInferenceServiceRow(name: string) {
    return new InferenceServiceRow(() =>
      this.findInferenceServiceTable()
        .find('tbody')
        .find('[data-label="Name"]')
        .contains(name)
        .closest('tr'),
    );
  }
}

export const modelServingGlobal = new ModelServingGlobal();
export const inferenceServiceModal = new InferenceServiceModal();
export const inferenceServiceModalEdit = new InferenceServiceModal(true);
export const modelServingSection = new ModelServingSection();
export const createServingRuntimeModal = new ServingRuntimeModal(false);
export const editServingRuntimeModal = new ServingRuntimeModal(true);
export const kserveModal = new KServeModal();
export const kserveModalEdit = new KServeModal(true);
