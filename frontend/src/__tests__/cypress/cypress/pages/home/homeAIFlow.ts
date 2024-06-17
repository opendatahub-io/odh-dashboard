import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

class AIFlowCard extends Contextual<HTMLElement> {}

export class HomeAIFlow extends Contextual<HTMLElement> {
  getProjectCard(): AIFlowCard {
    return new AIFlowCard(() => this.find().findByTestId('ai-flow-projects-card'));
  }

  getTrainFlowCard(): AIFlowCard {
    return new AIFlowCard(() => this.find().findByTestId('ai-flow-train-card'));
  }

  getModelsFlowCard(): AIFlowCard {
    return new AIFlowCard(() => this.find().findByTestId('ai-flow-models-card'));
  }

  findWorkbenchesAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-workbenches-info');
  }

  findProjectsAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-projects-info');
  }

  findConnectionsAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-connections-info');
  }

  findStorageAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-storage-info');
  }

  findPipelinesAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-pipelines-info');
  }

  findRunsAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-runs-info');
  }

  findModelServerAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-model-servers-info');
  }

  findModelDeployAIFlowInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-model-deploy-info');
  }

  findAIFlowClose(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('ai-flows-close-info');
  }

  findModelMeshDescriptionAdditionalText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-model-mesh');
  }

  findNoModelMeshDescriptionAdditionalText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-no-model-mesh');
  }

  findNoModelServingDescriptionAdditionalText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-no-model-serving');
  }

  findNoPipelinesDescriptionAdditionalText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-no-pipelines');
  }

  findPipelinesTrainDescriptionText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`create-and-train-pipelines-trailer`);
  }

  findModelMeshEnabledText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-no-model-mesh');
  }

  findModelMeshDisabledText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('project-workbenches--trailer-no-model-serving');
  }
}
