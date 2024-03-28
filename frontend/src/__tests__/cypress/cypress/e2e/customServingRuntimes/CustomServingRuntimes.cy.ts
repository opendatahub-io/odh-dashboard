import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { servingRuntimes } from '~/__tests__/cypress/cypress/pages/servingRuntimes';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

const addfilePath = '../../__mocks__/mock-custom-serving-runtime-add.yaml';
const editfilePath = '../../__mocks__/mock-custom-serving-runtime-edit.yaml';

const initialMock = [
  mockServingRuntimeTemplateK8sResource({
    name: 'template-1',
    displayName: 'Multi Platform',
    platforms: [ServingRuntimePlatform.SINGLE],
  }),
  mockServingRuntimeTemplateK8sResource({
    name: 'template-2',
    displayName: 'Caikit',
    platforms: [ServingRuntimePlatform.SINGLE],
    apiProtocol: ServingRuntimeAPIProtocol.GRPC,
  }),
  mockServingRuntimeTemplateK8sResource({
    name: 'template-3',
    displayName: 'OVMS',
    platforms: [ServingRuntimePlatform.MULTI],
  }),
  mockServingRuntimeTemplateK8sResource({
    name: 'template-4',
    displayName: 'Serving Runtime with No Annotations',
  }),
];

describe('Custom serving runtimes', () => {
  beforeEach(() => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/dashboardConfig/opendatahub/odh-dashboard-config', mockDashboardConfig({}));
    cy.intercept({ pathname: '/api/templates/opendatahub' }, mockK8sResourceList(initialMock));
    cy.intercept(
      '/api/k8s/apis/project.openshift.io/v1/projects',
      mockK8sResourceList([mockProjectK8sResource({})]),
    );

    servingRuntimes.visit();
  });

  it('should display platform labels', () => {
    servingRuntimes.shouldBeSingleModel(true).shouldBeMultiModel(true);
  });

  it('should display platform labels in table rows', () => {
    servingRuntimes.getRowById('template-1').shouldBeSingleModel(true);
    servingRuntimes.getRowById('template-2').shouldBeSingleModel(true);
    servingRuntimes.getRowById('template-3').shouldBeMultiModel(true);
    servingRuntimes.getRowById('template-4').shouldBeMultiModel(true);
  });

  it('should display api protocol in table row', () => {
    servingRuntimes.getRowById('template-1').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.getRowById('template-2').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
    servingRuntimes.getRowById('template-3').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.getRowById('template-4').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
  });

  it('should add a new single model serving runtime', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/servingRuntimes',
      },
      mockServingRuntimeTemplateK8sResource({}).objects,
    ).as('createSingleModelServingRuntime');

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/templates/',
      },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('createTemplate');

    servingRuntimes.findAddButton().click();
    servingRuntimes.findAppTitle().should('contain', 'Add serving runtime');

    // Check serving runtime dropdown list
    servingRuntimes.shouldDisplayServingRuntimeValues([
      'Single-model serving platform',
      'Multi-model serving platform',
    ]);
    servingRuntimes.findSelectServingPlatformButton().click();

    servingRuntimes.findSubmitButton().should('be.disabled');
    servingRuntimes.selectPlatform('Single-model serving platform');
    servingRuntimes.shouldDisplayAPIProtocolValues([
      ServingRuntimeAPIProtocol.REST,
      ServingRuntimeAPIProtocol.GRPC,
    ]);
    servingRuntimes.selectAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.findStartFromScratchButton().click();
    servingRuntimes.uploadYaml(addfilePath);
    servingRuntimes.getDashboardCodeEditor().findInput().should('not.be.empty');

    servingRuntimes.findSubmitButton().should('be.enabled');
    servingRuntimes.findSubmitButton().click();

    cy.wait('@createSingleModelServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'template-new',
          annotations: { 'openshift.io/display-name': 'New OVMS Server' },
          namespace: 'opendatahub',
        },
      });
    });

    cy.wait('@createTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'opendatahub.io/modelServingSupport': '["single"]',
            'opendatahub.io/apiProtocol': 'REST',
          },
        },
        objects: [
          {
            metadata: {
              name: 'template-new',
              annotations: { 'openshift.io/display-name': 'New OVMS Server' },
              labels: { 'opendatahub.io/dashboard': 'true' },
            },
          },
        ],
      });
    });
  });

  it('should add a new multi model serving runtime', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/servingRuntimes',
      },
      mockServingRuntimeTemplateK8sResource({}).objects,
    ).as('createMultiModelServingRuntime');
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/templates/',
      },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('createTemplate');

    servingRuntimes.findAddButton().click();
    servingRuntimes.findAppTitle().should('contain', 'Add serving runtime');

    // Check serving runtime dropdown list
    servingRuntimes.shouldDisplayServingRuntimeValues([
      'Single-model serving platform',
      'Multi-model serving platform',
    ]);
    servingRuntimes.findSelectServingPlatformButton().click();

    servingRuntimes.findSubmitButton().should('be.disabled');
    servingRuntimes.selectPlatform('Multi-model serving platform');
    servingRuntimes.findSelectAPIProtocolButton().should('not.be.enabled');
    servingRuntimes.findSelectAPIProtocolButton().should('include.text', 'REST');
    servingRuntimes.findStartFromScratchButton().click();
    servingRuntimes.uploadYaml(addfilePath);
    servingRuntimes.findSubmitButton().should('be.enabled');
    servingRuntimes.findSubmitButton().click();

    cy.wait('@createMultiModelServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body.metadata).to.eql({
        name: 'template-new',
        annotations: { 'openshift.io/display-name': 'New OVMS Server' },
        labels: { 'opendatahub.io/dashboard': 'true' },
        namespace: 'opendatahub',
      });
    });

    cy.wait('@createTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'opendatahub.io/modelServingSupport': '["multi"]',
            'opendatahub.io/apiProtocol': 'REST',
          },
        },
        objects: [
          {
            metadata: {
              name: 'template-new',
              annotations: { 'openshift.io/display-name': 'New OVMS Server' },
              labels: { 'opendatahub.io/dashboard': 'true' },
            },
          },
        ],
      });
    });
  });

  it('should duplicate a serving runtime', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/servingRuntimes',
      },
      mockServingRuntimeTemplateK8sResource({}).objects,
    ).as('duplicateServingRuntime');
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/templates/',
      },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('duplicateTemplate');

    const ServingRuntimeTemplateMock = mockServingRuntimeTemplateK8sResource({
      name: 'serving-runtime-template-1',
      displayName: 'Multi platform',
      platforms: [ServingRuntimePlatform.SINGLE],
      apiProtocol: ServingRuntimeAPIProtocol.GRPC,
    });

    cy.intercept(
      { pathname: '/api/templates/opendatahub' },
      mockK8sResourceList([...initialMock, ServingRuntimeTemplateMock]),
    ).as('refreshServingRuntime');

    servingRuntimes.getRowById('template-1').find().findKebabAction('Duplicate').click();
    servingRuntimes.findAppTitle().should('have.text', 'Duplicate serving runtime');
    cy.url().should('include', '/addServingRuntime');

    servingRuntimes.shouldDisplayAPIProtocolValues([
      ServingRuntimeAPIProtocol.REST,
      ServingRuntimeAPIProtocol.GRPC,
    ]);
    servingRuntimes.selectAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
    servingRuntimes.findSubmitButton().should('be.enabled');
    servingRuntimes.findSubmitButton().click();

    cy.wait('@duplicateServingRuntime').then((interception) => {
      expect(interception.request.body.metadata).to.containSubset({
        name: 'template-1-copy',
        annotations: { 'openshift.io/display-name': 'Copy of Multi Platform' },
        namespace: 'opendatahub',
      });
    });

    cy.wait('@duplicateTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'opendatahub.io/modelServingSupport': '["single"]',
            'opendatahub.io/apiProtocol': 'gRPC',
          },
        },
        objects: [
          {
            metadata: {
              name: 'template-1-copy',
              annotations: { 'openshift.io/display-name': 'Copy of Multi Platform' },
            },
          },
        ],
      });
    });
    cy.wait('@refreshServingRuntime');

    servingRuntimes
      .getRowById('serving-runtime-template-1')
      .shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
  });

  it('should edit a serving runtime', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/servingRuntimes',
      },
      {
        delay: 500,
        body: mockServingRuntimeTemplateK8sResource({}).objects,
      },
    ).as('editServingRuntime');
    cy.intercept(
      {
        method: 'PATCH',
        pathname: '/api/templates/opendatahub/template-1',
      },
      mockServingRuntimeTemplateK8sResource({}),
    ).as('editTemplate');

    servingRuntimes.getRowById('template-1').find().findKebabAction('Edit').click();
    servingRuntimes.findAppTitle().should('contain', 'Edit Multi Platform');
    cy.url().should('include', '/editServingRuntime/template-1');
    servingRuntimes.findSubmitButton().should('be.disabled');
    servingRuntimes.uploadYaml(editfilePath);
    servingRuntimes.findSubmitButton().click();

    cy.wait('@editServingRuntime').then((interception) => {
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'template-1',
          annotations: { 'openshift.io/display-name': 'Updated Multi Platform' },
        },
      });
    });

    cy.wait('@editTemplate').then((interception) => {
      expect(interception.request.body).to.containSubset([
        {
          value: {
            metadata: {
              name: 'template-1',
              annotations: { 'openshift.io/display-name': 'Updated Multi Platform' },
            },
          },
        },
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1modelServingSupport',
          value: '["single"]',
        },
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1apiProtocol',
          value: 'REST',
        },
      ]);
    });
  });

  it('delete serving runtime', () => {
    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/templates/opendatahub/template-1',
      },
      {},
    ).as('deleteServingRuntime');

    servingRuntimes.getRowById('template-1').find().findKebabAction('Delete').click();
    deleteModal.findSubmitButton().should('be.disabled');

    // test delete form is enabled after filling out required fields
    deleteModal.findInput().type('Multi Platform');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteServingRuntime');
  });
});
