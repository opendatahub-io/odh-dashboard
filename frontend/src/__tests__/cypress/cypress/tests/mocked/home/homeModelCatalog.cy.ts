import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { homePage } from '#~/__tests__/cypress/cypress/pages/home/home';
import {
  mockConfigMap404Response,
  mockManagedModelCatalogConfigMap,
  mockModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '#~/__mocks__/mockModelCatalogConfigMap';
import type { ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import { ConfigMapModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelCatalogSource } from '#~/__mocks__/mockModelCatalogSource';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelRegistryService,
} from '#~/__mocks__';
import { mockCatalogModel } from '#~/__mocks__/mockCatalogModel';

type HandlersProps = {
  modelRegistries?: K8sResourceCommon[];
  catalogSources?: ModelCatalogSource[];
  disableModelCatalogFeature?: boolean;
  hasUnmanagedSourcesConfigMap?: boolean;
  unmanagedSources?: ModelCatalogSource[];
  managedSources?: ModelCatalogSource[];
};

const initIntercepts = ({
  modelRegistries = [mockModelRegistryService({ name: 'modelregistry-sample' })],
  managedSources = [mockModelCatalogSource({})],
  unmanagedSources = [],
  disableModelCatalogFeature = false,
  hasUnmanagedSourcesConfigMap = true,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: disableModelCatalogFeature,
    }),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockManagedModelCatalogConfigMap(managedSources),
  );

  if (hasUnmanagedSourcesConfigMap) {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-unmanaged-sources',
      },
      mockUnmanagedModelCatalogConfigMap(unmanagedSources),
    );
  } else {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-unmanaged-sources',
      },
      mockConfigMap404Response('model-catalog-unmanaged-sources'),
    );
  }

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));
};

describe('Homepage Model Catalog section', () => {
  beforeEach(() => {
    initIntercepts({ disableModelCatalogFeature: false });
  });

  it('should hide the model catalog section when disabled', () => {
    homePage.initHomeIntercepts({ disableModelCatalog: true });
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  it('should hide the model catalog section when no models exist', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap([
        mockModelCatalogSource({
          source: 'Red Hat',
          models: [],
        }),
      ]),
    );
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });
  // TODO: Temporarily disabled model catalog section - to be re-enabled in future -->  https://issues.redhat.com/browse/RHOAIENG-34405

  // it('should show the model catalog section when enabled and models exist', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [mockCatalogModel({ labels: ['featured'] })],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   homePage.getHomeModelCatalogSection().find().should('exist');
  // });

  // it('should show the hint and allow closing it', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [mockCatalogModel({ labels: ['featured'] })],
  //       }),
  //     ]),
  //   );
  //   window.localStorage.setItem('odh.dashboard.model.catalog.hint', 'false');
  //   homePage.visit();
  //   const modelCatalogSection = homePage.getHomeModelCatalogSection();
  //   modelCatalogSection.getModelCatalogHint().should('be.visible');
  //   modelCatalogSection.getModelCatalogHintCloseButton().click();
  //   modelCatalogSection.getModelCatalogHint().should('not.exist');
  // });

  // it('should render correct number of model cards', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [
  //           mockCatalogModel({ name: 'model-1', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-2', labels: ['featured'] }),
  //         ],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   homePage
  //     .getHomeModelCatalogSection()
  //     .getModelCatalogCardGallery()
  //     .children()
  //     .should('have.length', 2);
  // });

  // it('should show footer text with visible model count - not all models are visible', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [
  //           mockCatalogModel({ name: 'model-1', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-2', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-3', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-4', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-5', labels: ['featured'] }),
  //         ],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   homePage
  //     .getHomeModelCatalogSection()
  //     .getModelCatalogFooter()
  //     .should('contain', '4 of 5 models');
  // });

  // it('should show footer text with visible model count - all models are visible', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [
  //           mockCatalogModel({ name: 'model-1', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-2', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-3', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-4', labels: ['featured'] }),
  //         ],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   homePage
  //     .getHomeModelCatalogSection()
  //     .getModelCatalogFooter()
  //     .should('contain', 'Showing all models');
  // });

  // it('should show featured models only, but include non-featured model count as part of total count in footer', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [
  //           mockCatalogModel({ name: 'model-1', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-2', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-3', labels: ['featured'] }),
  //           mockCatalogModel({ name: 'model-4', labels: [] }),
  //           mockCatalogModel({ name: 'model-5', labels: [] }),
  //         ],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   const modelCatalogSection = homePage.getHomeModelCatalogSection();
  //   modelCatalogSection.getModelCatalogCardGallery().children().should('have.length', 3);
  //   modelCatalogSection.getModelCatalogFooter().should('contain', '3 of 5 models');
  // });

  // it('should navigate to model catalog page', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [mockCatalogModel({ labels: ['featured'] })],
  //       }),
  //     ]),
  //   );
  //   homePage.visit();
  //   homePage.getHomeModelCatalogSection().getModelCatalogFooterLink().click();
  //   cy.url().should('include', '/catalog');
  // });

  // it('should display error message when fails to load', () => {
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     {
  //       statusCode: 500,
  //       body: {
  //         kind: 'Status',
  //         apiVersion: 'v1',
  //         status: 'Failure',
  //         message: 'Internal server error',
  //         reason: 'InternalError',
  //         code: 500,
  //       },
  //     },
  //   );
  //   homePage.visit();
  //   cy.findByTestId('error-loading').should('be.visible');
  //   cy.findByTestId('error-loading-message').should('have.text', 'Internal server error');
  // });

  // it('should show a loading spin while loading data', () => {
  //   const response = mockModelCatalogConfigMap([
  //     mockModelCatalogSource({
  //       source: 'Red Hat',
  //       models: [
  //         mockCatalogModel({ name: 'model-1', labels: ['featured'] }),
  //         mockCatalogModel({ name: 'model-2', labels: ['featured'] }),
  //       ],
  //     }),
  //   ]);
  //   let sendResponse: (value: void) => void;
  //   const trigger = new Promise((resolve) => {
  //     sendResponse = resolve;
  //   });
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     async (request) => {
  //       await trigger;
  //       request.reply(response);
  //     },
  //   );

  //   homePage.visit();
  //   cy.findByTestId('loading-empty-state')
  //     .should('exist')
  //     .then(() => {
  //       sendResponse();
  //       homePage.getHomeModelCatalogSection().find().should('exist');
  //     });
  // });

  it('should not load models that are not featured', () => {
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'opendatahub',
        name: 'model-catalog-sources',
      },
      mockModelCatalogConfigMap([
        mockModelCatalogSource({
          source: 'Red Hat',
          models: [mockCatalogModel({ labels: [] })],
        }),
      ]),
    );
    homePage.visit();
    homePage.getHomeModelCatalogSection().find().should('not.exist');
  });

  // it('should truncate model catalog card description when description is exceeds 2 lines, and show tooltip with full description', () => {
  //   const description =
  //     'Mauris dignissim pretium augue non blandit. Nullam sodales, nisl sed egestas tempus, mauris quam aliquet massa, ut euismod massa magna in neque. Aliquam at tortor sem. Nulla rutrum in turpis in condimentum. Sed condimentum rutrum velit, vel porttitor massa auctor sed. Vivamus lacinia arcu tortor, sit amet pretium nibh venenatis sit amet. Aenean eget condimentum sapien. Ut viverra mauris quam, quis malesuada velit fringilla et. Curabitur bibendum volutpat lorem, vel euismod justo rutrum a. Donec placerat dui eget nisl consectetur tristique. Aliquam sodales sed neque sed mollis.';
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [mockCatalogModel({ labels: ['featured'], description })],
  //       }),
  //     ]),
  //   );

  //   homePage.visit();
  //   const modelCatalogSection = homePage.getHomeModelCatalogSection();
  //   modelCatalogSection.getModelCatalogCardDescription().trigger('mouseenter');
  //   modelCatalogSection.getModelCatalogCardDescriptionTooltip().should('have.text', description);
  // });

  // it('should truncate model catalog card name when name is too long, and show tooltip with full name', () => {
  //   const name =
  //     'Mauris dignissim pretium augue non blandit. Nullam sodales, nisl sed egestas tempus, mauris quam aliquet massa, ut euismod massa magna in neque. Aliquam at tortor sem. Nulla rutrum in turpis in condimentum. Sed condimentum rutrum velit, vel porttitor massa auctor sed. Vivamus lacinia arcu tortor, sit amet pretium nibh venenatis sit amet. Aenean eget condimentum sapien. Ut viverra mauris quam, quis malesuada velit fringilla et. Curabitur bibendum volutpat lorem, vel euismod justo rutrum a. Donec placerat dui eget nisl consectetur tristique. Aliquam sodales sed neque sed mollis.';
  //   cy.interceptK8s(
  //     {
  //       model: ConfigMapModel,
  //       ns: 'opendatahub',
  //       name: 'model-catalog-sources',
  //     },
  //     mockModelCatalogConfigMap([
  //       mockModelCatalogSource({
  //         source: 'Red Hat',
  //         models: [mockCatalogModel({ labels: ['featured'], name })],
  //       }),
  //     ]),
  //   );

  //   homePage.visit();
  //   const modelCatalogSection = homePage.getHomeModelCatalogSection();
  //   modelCatalogSection.getModelCatalogCardName().trigger('mouseenter');
  //   modelCatalogSection.getModelCatalogCardNameTooltip().should('have.text', name);
  // });
});
