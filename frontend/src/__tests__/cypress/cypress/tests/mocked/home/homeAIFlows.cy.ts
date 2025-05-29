import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';

describe('Home page AI Flows', () => {
  const homeAISection = homePage.getHomeAISection();
  beforeEach(() => {
    homePage.initHomeIntercepts();
    homePage.visit();
  });
  it('should show the appropriate AI flow cards', () => {
    homeAISection.getProjectCard().find().should('be.visible');
    homeAISection.getTrainFlowCard().find().should('be.visible');
    homeAISection.getModelsFlowCard().find().should('be.visible');
  });

  it('should show the AI flow hint and close it', () => {
    const aiFlowSection = homeAISection.findAIFlowHint();
    aiFlowSection.find().should('not.exist');
    homePage.initHomeIntercepts({ disableFineTuning: false });
    homePage.visit();
    aiFlowSection.find().should('be.visible');
    aiFlowSection
      .findAIFlowHintText()
      .contains(
        'LAB-tuning significantly reduces limitations associated with traditional fine-tuning methods, such as high resource usage and time-consuming manual data generation.',
      );
    aiFlowSection.findAIFlowHintImage().should('be.visible');
    aiFlowSection.findAIFlowHintCloseButton().click();
    aiFlowSection.find().should('not.exist');
  });

  it('should navigate from ai flow hint to the model customization page', () => {
    homePage.initHomeIntercepts({ disableFineTuning: false });
    homePage.visit();
    const aiFlowSection = homeAISection.findAIFlowHint();
    aiFlowSection.findAIFlowHintNavigationLink().click();
    cy.url().should('include', '/modelCustomization');
  });

  it('should show the appropriate info cards', () => {
    homeAISection.getProjectCard().find().click();
    homeAISection.findProjectsAIFlowInfo().should('be.visible');
    homeAISection.findConnectionsAIFlowInfo().should('be.visible');
    homeAISection.findStorageAIFlowInfo().should('be.visible');
    homeAISection.getTrainFlowCard().find().click();
    homeAISection.findWorkbenchesAIFlowInfo().should('be.visible');
    homeAISection.findPipelinesAIFlowInfo().should('be.visible');
    homeAISection.findRunsAIFlowInfo().should('be.visible');

    homeAISection.getModelsFlowCard().find().click();
    homeAISection.findModelServerAIFlowInfo().should('be.visible');
    homeAISection.findModelDeployAIFlowInfo().should('be.visible');
  });

  it('should close the info cards on re-click', () => {
    homeAISection.getProjectCard().find().click();
    homeAISection.findProjectsAIFlowInfo().should('be.visible');
    homeAISection.findConnectionsAIFlowInfo().should('be.visible');
    homeAISection.findStorageAIFlowInfo().should('be.visible');

    homeAISection.getProjectCard().find().click();
    homeAISection.findProjectsAIFlowInfo().should('not.exist');
    homeAISection.findConnectionsAIFlowInfo().should('not.exist');
    homeAISection.findStorageAIFlowInfo().should('not.exist');
  });

  it('should close the info cards on close button click', () => {
    homeAISection.getProjectCard().find().click();
    homeAISection.findProjectsAIFlowInfo().should('be.visible');
    homeAISection.findConnectionsAIFlowInfo().should('be.visible');
    homeAISection.findStorageAIFlowInfo().should('be.visible');

    homeAISection.findAIFlowClose().click();
    homeAISection.findProjectsAIFlowInfo().should('not.exist');
    homeAISection.findConnectionsAIFlowInfo().should('not.exist');
    homeAISection.findStorageAIFlowInfo().should('not.exist');
  });

  it('should hide sections that are disabled', () => {
    homePage.initHomeIntercepts({ disableProjects: true });
    homePage.visit();

    homeAISection.getProjectCard().find().should('not.exist');

    homePage.initHomeIntercepts({
      disableModelServing: true,
      disableModelRegistry: true,
    });
    homePage.visit();

    homeAISection.getModelsFlowCard().find().should('not.exist');
  });

  it('should hide info cards that are disabled', () => {
    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();

    homeAISection.getTrainFlowCard().find().click();

    homeAISection.findWorkbenchesAIFlowInfo().should('be.visible');
    homeAISection.findPipelinesAIFlowInfo().should('not.exist');
    homeAISection.findRunsAIFlowInfo().should('not.exist');
  });

  it('should render projects content specific to feature availability', () => {
    homeAISection.getProjectCard().find().click();
    homeAISection.findModelMeshDescriptionAdditionalText().scrollIntoView();
    homePage.initHomeIntercepts({ disableModelMesh: true });
    homePage.visit();
    homeAISection.getProjectCard().find().click();
    homeAISection.findNoModelMeshDescriptionAdditionalText().scrollIntoView();
    homePage.initHomeIntercepts({ disableModelServing: true });
    homePage.visit();
    homeAISection.getProjectCard().find().click();
    homeAISection.findNoModelServingDescriptionAdditionalText().scrollIntoView();

    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();
    homeAISection.getProjectCard().find().click();
    homeAISection.findNoPipelinesDescriptionAdditionalText().scrollIntoView();
  });

  it('should render workbenches content specific to feature availability', () => {
    homeAISection.getTrainFlowCard().find().click();
    homeAISection.findPipelinesTrainDescriptionText().should('exist');
    homePage.initHomeIntercepts({ disablePipelines: true });
    homePage.visit();
    homeAISection.getTrainFlowCard().find().click();
    homeAISection.findPipelinesTrainDescriptionText().should('not.exist');
  });

  it('should hide the models card when model serving backend components are not installed', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        installedComponents: {
          kserve: false,
          'model-mesh': false,
          'model-registry-operator': false,
        },
      }),
    );
    homePage.visit();
    homeAISection.getModelsFlowCard().find().should('not.exist');
  });
});
