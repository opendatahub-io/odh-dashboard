import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { mixin } from '~/__tests__/cypress/cypress/utils/mixin';

class ModelServingGlobal {
  visit(project?: string) {
    cy.visitWithLogin(`/modelServing${project ? `/${project}` : ''}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model Serving').click();
    this.wait();
  }

  private wait() {
    cy.findByText('Manage and view the health and performance of your deployed models.');
    cy.testA11y();
  }

  shouldBeEmpty() {
    cy.findByText(/No deployed models/);
    return this;
  }

  shouldWaitAndCancel() {
    cy.findAllByText(
      'Retrieving model data from all projects in the cluster. This can take a few minutes.',
    );
    this.findCancelButton().click();
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  findDeployModelButton() {
    return cy.findByRole('button', { name: 'Deploy model' });
  }

  findNoProjectSelectedTooltip() {
    return cy.findByRole('tooltip', { name: 'To deploy a model, select a project.' });
  }

  findGoToProjectButton() {
    return cy.findByRole('button', { name: /^Go to / });
  }

  findModelsTable() {
    // TODO be more precise
    return cy.findByRole('grid');
  }

  findModelRow(name: string) {
    return this.findModelsTable().findByRole('cell', { name }).parents('tr');
  }
}

class InferenceServiceModal extends Modal {
  constructor() {
    super('Deploy model');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Deploy' });
  }

  findModelNameInput() {
    return cy.findByLabelText('Model name *');
  }

  findServingRuntimeSelect() {
    return this.find().get('#inference-service-model-selection');
  }

  findModelFrameworkSelect() {
    return this.find().get('#inference-service-framework-selection');
  }

  findExistingDataConnectionOption() {
    return this.find().findByText('Existing data connection');
  }

  findNewDataConnectionOption() {
    return this.find().findByText('New data connection');
  }

  findExistingConnectionSelect() {
    return this.find()
      .findByRole('group', { name: 'Model location' })
      .findByRole('button', { name: 'Options menu' });
  }

  findLocationNameInput() {
    return this.find().findByRole('textbox', { name: 'Field list Name' });
  }

  findLocationAccessKeyInput() {
    return this.find().findByRole('textbox', { name: 'Field list AWS_ACCESS_KEY_ID' });
  }

  findLocationSecretKeyInput() {
    return this.find().findByLabelText('Field list AWS_SECRET_ACCESS_KEY');
  }

  findLocationEndpointInput() {
    return this.find().findByLabelText('Field list AWS_S3_ENDPOINT');
  }

  findLocationBucketInput() {
    return this.find().findByRole('textbox', { name: 'Field list AWS_S3_BUCKET' });
  }

  findLocationPathInput() {
    return this.find().findByLabelText('folder-path');
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
    return this.findFooter().findByRole('button', { name: this.edit ? 'Update' : 'Add' });
  }

  findModelServerNameInput() {
    return this.find().findByLabelText('Model server name *');
  }

  findServingRuntimeTemplateDropdown() {
    return this.find().get('#serving-runtime-template-selection');
  }

  findModelRouteCheckbox() {
    return this.find().get('#alt-form-checkbox-route');
  }

  findAuthenticationCheckbox() {
    return this.find().get('#alt-form-checkbox-auth');
  }

  findExternalRouteError() {
    return this.find().get('#external-route-no-token-alert');
  }

  findServiceAccountNameInput() {
    return this.find().get('#service-account-form-name');
  }

  findModelServerSizeSelect() {
    return this.find()
      .findByRole('group', { name: 'Compute resources per replica' })
      .findByRole('button', { name: 'Options menu' });
  }

  findModelServerReplicasMinusButton() {
    return this.find()
      .findByRole('group', { name: 'Model server replicas' })
      .findByRole('button', { name: 'Minus' });
  }

  findModelServerReplicasPlusButton() {
    return this.find()
      .findByRole('group', { name: 'Model server replicas' })
      .findByRole('button', { name: 'Plus' });
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
    this.find().find('[data-label="Serving Runtime"]').findByText(servingRuntime);
    return this;
  }

  shouldHaveTokens(enabled: boolean) {
    this.find()
      .find('[data-label="Tokens"]')
      .findByText('Tokens disabled')
      .should(enabled ? 'not.exist' : 'exist');
    return this;
  }
}

class ModelMeshRow extends ModelServingRow {
  findExpandButton() {
    return this.find().find('[data-label="Model Server Name"] button');
  }

  findDeployModelButton() {
    return this.find().findByRole('button', { name: 'Deploy model' });
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
    return this.find().find('button').first();
  }
}

class ModelServingSection {
  find() {
    return cy.get('#model-server');
  }

  findDeployModelButton() {
    return this.find().findByRole('button', { name: 'Deploy model' });
  }

  findAddModelServerButton() {
    return this.find().findByRole('button', { name: 'Add model server' });
  }

  private findTable() {
    // TODO be more precise
    return this.find().findByRole('grid');
  }

  getKServeRow(name: string) {
    return new KServeRow(() =>
      this.findTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }

  getModelMeshRow(name: string) {
    return new ModelMeshRow(() =>
      this.findTable().find('[data-label="Model Server Name"]').contains(name).parents('tr'),
    );
  }

  private findRow(rowName: string) {
    return this.findTable().contains('tr', rowName);
  }

  findDescriptionListItem(rowName: string, itemName: string) {
    return this.findRow(rowName).next('tr').find(`dt:contains("${itemName}")`);
  }

  findInferenceServiceTable() {
    return cy.findByTestId('inference-service-table');
  }

  findInferenceServiceRowStatus(name: string) {
    return this.findInferenceServiceTable()
      .contains('tr', name)
      .within(() => {
        cy.get('td[data-label="Status"]');
      });
  }

  findStatusTooltip(name: string) {
    return this.findInferenceServiceRowStatus(name)
      .findByTestId('status-tooltip')
      .trigger('mouseenter')
      .then(() => {
        cy.findByTestId('model-status-tooltip');
      });
  }

  findStatusTooltipValue(name: string, msg: string) {
    this.findStatusTooltip(name)
      .invoke('text')
      .should('contain', msg)
      .then(() => {
        this.findStatusTooltip(name).trigger('mouseleave');
      });
  }

  findAPIProtocol(name: string) {
    return this.findInferenceServiceTable()
      .contains('tr', name)
      .find('td[data-label="API protocol"]');
  }
}

export const modelServingGlobal = new ModelServingGlobal();
export const inferenceServiceModal = new InferenceServiceModal();
export const modelServingSection = new ModelServingSection();
export const createServingRuntimeModal = new ServingRuntimeModal(false);
export const editServingRuntimeModal = new ServingRuntimeModal(true);
export const kserveModal = new KServeModal();
