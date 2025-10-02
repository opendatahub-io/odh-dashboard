import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';
import { mixin } from '#~/__tests__/cypress/cypress/utils/mixin';
import { K8sNameDescriptionField } from '#~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { Contextual } from './components/Contextual';
import { Wizard } from './components/Wizard';

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
    cy.visitWithLogin(`/ai-hub/deployments${project ? `/${project}` : ''}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Deployments', rootSection: 'AI hub' }).click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Deployments');
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

  clickDeployModelButtonWithRetry() {
    this.findDeployModelButton().click();
    // If modal doesn't appear, retry once
    cy.get('body').then(($body) => {
      if ($body.find('[role="dialog"]:visible').length === 0) {
        this.findDeployModelButton().click();
      }
    });
    return this;
  }

  findNoProjectSelectedTooltip() {
    return cy.findByTestId('deploy-model-tooltip');
  }

  findGoToProjectButton() {
    return cy.findByTestId('empty-state-action-button');
  }

  findSingleServingModelButton() {
    return cy.findByTestId('kserve-select-button');
  }

  findMultiModelButton() {
    return cy.findByTestId('model-mesh-select-button');
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
    return this.findModelsTable().find(`[data-label=Serving runtime]`).contains(name);
  }

  findTokenCopyButton(index: number) {
    if (index === 0) {
      return cy.findAllByTestId('token-secret').findAllByRole('button').eq(0);
    }
    return cy.findAllByTestId('token-secret').eq(index).findAllByRole('button').eq(0);
  }
}

class ServingRuntimeGroup extends Contextual<HTMLElement> {}

class ServingModal extends Modal {
  findServingRuntimeTemplateSearchSelector() {
    return this.find().findByTestId('serving-runtime-template-selection-toggle');
  }

  findServingRuntimeTemplateSearchInput() {
    return cy.findByTestId('serving-runtime-template-selection-search').find('input');
  }

  findGlobalScopedTemplateOption(name: string) {
    return this.getGlobalScopedServingRuntime()
      .find()
      .findByRole('menuitem', { name: new RegExp(name), hidden: true });
  }

  findProjectScopedTemplateOption(name: string) {
    return this.getProjectScopedServingRuntime()
      .find()
      .findByRole('menuitem', { name: new RegExp(name), hidden: true });
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

  findServingRuntimeVersionLabel() {
    return cy.findByTestId('serving-runtime-version-label');
  }
}

class InferenceServiceModal extends ServingModal {
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

  findExistingPVCConnectionOption() {
    return this.find().findByTestId('pvc-serving-radio');
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

  findServiceAccountIndex(index: number) {
    return this.find().findAllByTestId('service-account-form-name').eq(index);
  }

  findAddServiceAccountButton() {
    return this.find().findByTestId('add-service-account-button');
  }

  findExistingConnectionSelect() {
    return this.find().findByTestId('typeahead-menu-toggle');
  }

  findExistingConnectionSelectValueField() {
    return this.findExistingConnectionSelect().findByRole('combobox', {
      name: 'Type to filter',
    });
  }

  findPVCSelect() {
    return this.find().findByTestId('pvc-connection-selector');
  }

  findHardProfileSelection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('hardware-profile-select');
  }

  selectProfile(name: string): void {
    this.findHardProfileSelection().click();
    cy.findByRole('option', { name }).click();
  }

  findAcceleratorProfileSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('accelerator-profile-select');
  }

  selectAcceleratorProfileOption(name: string): void {
    this.findAcceleratorProfileSelect().click();
    cy.contains(name).click();
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

  findUriLocationPathInput() {
    return this.find().findByTestId('field URI');
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

class ServingRuntimeModal extends ServingModal {
  k8sNameDescription = new K8sNameDescriptionField('serving-runtime');

  constructor(private edit = false) {
    super(`${edit ? 'Edit' : 'Add'} model server`);
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

  findMinReplicasInput() {
    return this.find().findByTestId('min-replicas').find('input');
  }

  findMaxReplicasInput() {
    return this.find().findByTestId('max-replicas').find('input');
  }

  findMinReplicasPlusButton() {
    return this.find().findByTestId('min-replicas').findByRole('button', { name: 'Plus' });
  }

  findMinReplicasMinusButton() {
    return this.find().findByTestId('min-replicas').findByRole('button', { name: 'Minus' });
  }

  findMaxReplicasPlusButton() {
    return this.find().findByTestId('max-replicas').findByRole('button', { name: 'Plus' });
  }

  findMaxReplicasMinusButton() {
    return this.find().findByTestId('max-replicas').findByRole('button', { name: 'Minus' });
  }

  findMaxReplicasErrorMessage() {
    return this.find().contains(
      'Maximum replicas must be greater than or equal to minimum replicas',
    );
  }

  findMinReplicasErrorMessage() {
    return this.find().contains('Minimum replicas must be less than or equal to maximum replicas');
  }

  findCPURequestedCheckbox() {
    return this.find().findByTestId('cpu-requested-checkbox');
  }

  findCPULimitCheckbox() {
    return this.find().findByTestId('cpu-limit-checkbox');
  }

  findMemoryRequestedCheckbox() {
    return this.find().findByTestId('memory-requested-checkbox');
  }

  findMemoryLimitCheckbox() {
    return this.find().findByTestId('memory-limit-checkbox');
  }

  findCPURequestedInput() {
    return this.find().findByTestId('cpu-requested-input').find('input');
  }

  findCPURequestedButton(type: 'Plus' | 'Minus') {
    return this.find().findByTestId('cpu-requested-input').findByRole('button', { name: type });
  }

  findCPULimitInput() {
    return this.find().findByTestId('cpu-limit-input').find('input');
  }

  findCPULimitButton(type: 'Plus' | 'Minus') {
    return this.find().findByTestId('cpu-limit-input').findByRole('button', { name: type });
  }

  findMemoryRequestedInput() {
    return this.find().findByTestId('memory-requested-input').find('input');
  }

  findMemoryRequestedButton(type: 'Plus' | 'Minus') {
    return this.find().findByTestId('memory-requested-input').findByRole('button', { name: type });
  }

  findMemoryLimitInput() {
    return this.find().findByTestId('memory-limit-input').find('input');
  }

  findMemoryLimitButton(type: 'Plus' | 'Minus') {
    return this.find().findByTestId('memory-limit-input').findByRole('button', { name: type });
  }

  findPVCConnectionOption() {
    return this.find().findByTestId('pvc-serving-radio');
  }
}
mixin(KServeModal, [ServingRuntimeModal, InferenceServiceModal]);

class ModelServingRow extends TableRow {
  shouldHaveServingRuntime(servingRuntime: string) {
    this.find().find('[data-label="Serving runtime"]').contains(servingRuntime);
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

  findExternalServiceButton() {
    return this.find().findByTestId('internal-external-service-button');
  }

  findExternalServicePopover() {
    return cy.findByTestId('external-service-popover');
  }

  findAPIProtocol() {
    return this.find().find(`[data-label="API protocol"]`);
  }

  findLastDeployed() {
    return this.find().find(`[data-label="Last deployed"]`);
  }

  findConfirmStopModal() {
    return cy.findByTestId('stop-model-modal');
  }

  findConfirmStopModalButton() {
    return this.findConfirmStopModal().findByTestId('stop-model-button');
  }

  findConfirmStopModalCheckbox() {
    return this.findConfirmStopModal().findByTestId('dont-show-again-checkbox');
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

  findStateActionToggle() {
    return this.find().findByTestId('state-action-toggle');
  }

  findStatusLabel(label?: string, timeout?: number) {
    if (label) {
      return this.find()
        .findByTestId('model-status-text', { timeout })
        .should('include.text', label);
    }
    return this.find().findByTestId('model-status-text', { timeout });
  }
}

class InferenceServiceRow extends TableRow {
  findServingRuntimeVersionLabel() {
    return this.find().findByTestId('serving-runtime-version-label');
  }

  findServingRuntimeVersionStatusLabel() {
    return this.find().findByTestId('serving-runtime-version-status-label');
  }

  findStatusTooltip() {
    return this.find()
      .findByTestId('model-status-text')
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

  findLastDeployed() {
    return this.find().find(`[data-label="Last deployed"]`);
  }

  findLastDeployedTimestamp() {
    return this.find().findByTestId('last-deployed-timestamp');
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
    return this.find().find(`[data-label="Serving runtime"]`);
  }

  findProject() {
    return this.find().find(`[data-label=Project]`);
  }

  findStatusLabel(label: string) {
    return this.find().findByTestId('model-status-text').should('include.text', label);
  }
}

class ModelServingSection {
  visit(project: string) {
    cy.visitWithLogin(`/projects/${project}?section=model-server`);
    cy.findByTestId(`section-model-server`);
    cy.testA11y();
  }

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

  findModelServerDeployedName(name: string) {
    return this.find().findByTestId('deployed-model-name').contains(name);
  }

  findModelMetricsLink(name: string) {
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
    return this.find().findByTestId('model-status-text');
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

class ModelServingWizard extends Wizard {
  constructor(private edit = false) {
    super('Deploy a model', 'Deploy model');
  }

  findModelSourceStep() {
    return this.findStep('source-model-step');
  }

  findModelDeploymentStep() {
    return this.findStep('model-deployment-step');
  }

  findAdvancedOptionsStep() {
    return this.findStep('advanced-options-step');
  }

  findModelTypeSelect() {
    return cy.findByTestId('model-type-select');
  }

  findModelTypeSelectOption(name: string) {
    return this.findModelTypeSelect().findSelectOption(name);
  }

  findModelDeploymentNameInput() {
    return cy.findByTestId('model-deployment-name');
  }

  findModelDeploymentDescriptionInput() {
    return cy.findByTestId('model-deployment-description');
  }

  findModelFormatSelect() {
    return cy.findByTestId('model-framework-select');
  }

  findModelFormatSelectOption(name: string) {
    return this.findModelFormatSelect().findSelectOption(name);
  }

  findServingRuntimeTemplateSearchSelector() {
    return cy.findByTestId('serving-runtime-template-selection-toggle');
  }

  findServingRuntimeTemplateSearchInput() {
    return cy.findByTestId('serving-runtime-template-selection-search').find('input');
  }

  findGlobalScopedTemplateOption(name: string) {
    return this.getGlobalScopedServingRuntime()
      .find()
      .findByRole('menuitem', { name: new RegExp(name), hidden: true });
  }

  findProjectScopedTemplateOption(name: string) {
    return this.getProjectScopedServingRuntime()
      .find()
      .findByRole('menuitem', { name: new RegExp(name), hidden: true });
  }

  getGlobalServingRuntimesLabel() {
    return cy.get('body').contains('Global serving runtimes');
  }

  getProjectScopedServingRuntimesLabel() {
    return cy.get('body').contains('Project-scoped serving runtimes');
  }

  findProjectScopedLabel() {
    return cy.findByTestId('project-scoped-serving-runtime-template-label');
  }

  findGlobalScopedLabel() {
    return cy.findByTestId('global-scoped-serving-runtime-template-label');
  }

  getProjectScopedServingRuntime() {
    return new ServingRuntimeGroup(() => cy.findByTestId('project-scoped-serving-runtimes'));
  }

  getGlobalScopedServingRuntime() {
    return new ServingRuntimeGroup(() => cy.findByTestId('global-scoped-serving-runtimes'));
  }

  findServingRuntimeVersionLabel() {
    return cy.findByTestId('serving-runtime-version-label');
  }

  findModelLocationSelect() {
    return cy.findByTestId('model-location-select');
  }

  findModelLocationSelectOption(name: string) {
    return this.findModelLocationSelect().findSelectOption(name);
  }

  findExistingConnectionSelect() {
    return cy.findByTestId('typeahead-menu-toggle');
  }

  findOCIModelURI() {
    return cy.findByTestId('model-uri');
  }

  findUrilocationInput() {
    return cy.findByTestId('field URI');
  }

  findUrilocationInputError() {
    return cy.findByTestId('uri-form-field-helper-text');
  }

  findExternalRouteCheckbox() {
    return cy.findByTestId('model-access-checkbox');
  }

  findTokenAuthenticationCheckbox() {
    return cy.findByTestId('token-authentication-checkbox');
  }

  findTokenWarningAlert() {
    return cy.findByText(
      'Making models available by external routes without requiring authorization can lead to security vulnerabilities.',
    );
  }

  findServiceAccountNameInput() {
    return cy.findByTestId('service-account-form-name');
  }

  findAddServiceAccountButton() {
    return cy.findByTestId('add-service-account-button');
  }

  findAllServiceAccountInputs() {
    return cy.findAllByTestId('service-account-form-name');
  }

  findServiceAccountByIndex(index: number) {
    return this.findAllServiceAccountInputs().eq(index);
  }

  findServiceNameAlert() {
    return cy.findByText('Duplicates are invalid');
  }

  findAllRemoveServiceAccountButtons() {
    return cy.findAllByTestId('remove-service-account-button');
  }

  findRemoveServiceAccountByIndex(index: number) {
    return this.findAllRemoveServiceAccountButtons().eq(index);
  }

  findNumReplicasInput() {
    return cy.findByTestId('num-replicas');
  }

  findNumReplicasInputField() {
    return cy.findByTestId('num-replicas').find('input');
  }

  findNumReplicasMinusButton() {
    return cy.findByTestId('num-replicas').findByRole('button', { name: 'Minus' });
  }

  findNumReplicasPlusButton() {
    return cy.findByTestId('num-replicas').findByRole('button', { name: 'Plus' });
  }

  findRuntimeArgsCheckbox() {
    return cy.findByTestId('runtime-args-checkbox');
  }

  findRuntimeArgsTextBox() {
    return cy.findByTestId('runtime-args-textarea');
  }

  findEnvVariablesCheckbox() {
    return cy.findByTestId('env-vars-checkbox');
  }

  findAddVariableButton() {
    return cy.findByTestId('add-environment-variable');
  }

  findEnvVariableName(key: string) {
    return cy.findByTestId(`env-var-name-${key}`);
  }

  findEnvVariableValue(value: string) {
    return cy.findByTestId(`env-var-value-${value}`);
  }

  findSaveAiAssetCheckbox() {
    return cy.findByTestId('save-as-ai-asset-checkbox');
  }

  findUseCaseInput() {
    return cy.findByTestId('use-case-input');
  }

  findCPURequestedInput() {
    return cy.findByTestId('cpu-requests-input').find('input');
  }

  findCPURequestedButton(type: 'Plus' | 'Minus') {
    return cy.findByTestId('cpu-requests-input').findByRole('button', { name: type });
  }

  findCPULimitInput() {
    return cy.findByTestId('cpu-limits-input').find('input');
  }

  findCPULimitButton(type: 'Plus' | 'Minus') {
    return cy.findByTestId('cpu-limits-input').findByRole('button', { name: type });
  }

  findMemoryRequestedInput() {
    return cy.findByTestId('memory-requests-input').find('input');
  }

  findMemoryRequestedButton(type: 'Plus' | 'Minus') {
    return cy.findByTestId('memory-requests-input').findByRole('button', { name: type });
  }

  findMemoryLimitInput() {
    return cy.findByTestId('memory-limits-input').find('input');
  }

  findMemoryLimitButton(type: 'Plus' | 'Minus') {
    return cy.findByTestId('memory-limits-input').findByRole('button', { name: type });
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
export const modelServingWizard = new ModelServingWizard(false);
export const modelServingWizardEdit = new ModelServingWizard(true);
