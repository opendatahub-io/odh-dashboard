import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { mixin } from '~/__tests__/cypress/cypress/utils/mixin';
import { Contextual } from './components/Contextual';
import { TableToolbar } from './components/TableToolbar';

class ModelServingToolbar extends TableToolbar {}
class ModelServingGlobal {
  visit(project?: string) {
    cy.visit(`/modelServing${project ? `/${project}` : ''}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model Serving').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Deployed models');
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

  private findModelsTable() {
    // TODO be more precise
    return cy.findByTestId('inference-service-table');
  }

  getModelRow(name: string) {
    return this.findModelsTable().find(`[data-label=Name]`).contains(name).parents('tr');
  }

  findEmptyResults() {
    return cy.findByTestId('no-result-found-title');
  }

  findSortButton(name: string) {
    return this.findModelsTable().find('thead').findByRole('button', { name });
  }

  getTableToolbar() {
    return new ModelServingToolbar(() => cy.findByTestId('dashboard-table-toolbar'));
  }
}

class InferenceServiceModal extends Modal {
  constructor() {
    super('Deploy model');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findModelNameInput() {
    return this.find().findByTestId('inference-service-name-input');
  }

  findServingRuntimeSelect() {
    return this.find().find('#inference-service-model-selection');
  }

  findModelFrameworkSelect() {
    return this.find().find('#inference-service-framework-selection');
  }

  findExistingDataConnectionOption() {
    return this.find().findByTestId('existing-data-connection-radio');
  }

  findExternalRouteError() {
    return this.find().findByTestId('external-route-no-token-alert');
  }

  findServiceAccountNameInput() {
    return this.find().findByTestId('service-account-form-name');
  }

  findNewDataConnectionOption() {
    return this.find().findByTestId('new-data-connection-radio');
  }

  findExistingConnectionSelect() {
    return this.find()
      .findByRole('group', { name: 'Model location' })
      .findByRole('button', { name: 'Options menu' });
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

  findLocationPathInput() {
    return this.find().findByTestId('folder-path');
  }

  findLocationPathInputError() {
    return this.find().findByTestId('folder-path-error');
  }
}

class ServingRuntimeModal extends Modal {
  constructor(private edit = false) {
    super(edit ? 'Edit model server' : 'Add model server');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findModelServerNameInput() {
    return this.find().findByTestId('serving-runtime-name-input');
  }

  findModelServerSizeValue() {
    return this.find().findByLabelText('Model server size');
  }

  findServingRuntimeTemplateDropdown() {
    return this.find().findByTestId('serving-runtime-template-selection');
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

  findModelServerSizeSelect() {
    return this.find()
      .findByRole('group', { name: 'Compute resources per replica' })
      .findByRole('button', { name: 'Options menu' });
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface KServeModal extends ServingRuntimeModal, InferenceServiceModal {}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class KServeModal extends InferenceServiceModal {}
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
}

class InferenceServiceRow extends TableRow {
  findStatusTooltip() {
    return this.find()
      .findByTestId('status-tooltip')
      .trigger('mouseenter')
      .then(() => {
        cy.findByTestId('model-status-tooltip');
      });
  }

  findStatusTooltipValue(msg: string) {
    this.findStatusTooltip()
      .invoke('text')
      .should('contain', msg)
      .then(() => {
        this.findStatusTooltip().trigger('mouseleave');
      });
  }

  findAPIProtocol() {
    return this.find().find(`[data-label="API protocol"]`);
  }
}
class ServingPlatformCard extends Contextual<HTMLElement> {
  findDeployModelButton() {
    return this.find().findByTestId('single-serving-deploy-button');
  }

  findAddModelServerButton() {
    return this.find().findByTestId('multi-serving-add-server-button');
  }
}
class ModelServingSection {
  find() {
    return cy.findByTestId('section-model-server');
  }

  getServingPlatformCard(name: string) {
    return new ServingPlatformCard(() => cy.findAllByTestId(`${name}-platform-card`));
  }

  private findKServeTable() {
    return this.find().findByTestId('kserve-inference-service-table');
  }

  private findModelMeshTable() {
    return this.find().findByTestId('serving-runtime-table');
  }

  findKServeTableHeaderButton(name: string) {
    return this.findKServeTable().find('thead').findByRole('button', { name });
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
export const modelServingSection = new ModelServingSection();
export const createServingRuntimeModal = new ServingRuntimeModal(false);
export const editServingRuntimeModal = new ServingRuntimeModal(true);
export const kserveModal = new KServeModal();
