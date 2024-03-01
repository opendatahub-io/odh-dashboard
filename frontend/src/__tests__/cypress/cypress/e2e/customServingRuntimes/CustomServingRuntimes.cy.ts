import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { servingRuntimes } from '~/__tests__/cypress/cypress/pages/servingRuntimes';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';

describe('Custom serving runtimes', () => {
  beforeEach(() => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/dashboardConfig/opendatahub/odh-dashboard-config', mockDashboardConfig({}));
    cy.intercept(
      { pathname: '/api/templates/opendatahub' },
      mockK8sResourceList([
        mockServingRuntimeTemplateK8sResource({
          name: 'template-1',
          displayName: 'Multi Platform',
          platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
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
      ]),
    );
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
    servingRuntimes.getRowById('template-1').shouldBeSingleModel(true).shouldBeMultiModel(true);
    servingRuntimes.getRowById('template-2').shouldBeSingleModel(true).shouldBeMultiModel(false);
    servingRuntimes.getRowById('template-3').shouldBeSingleModel(false).shouldBeMultiModel(true);
    servingRuntimes.getRowById('template-4').shouldBeSingleModel(false).shouldBeMultiModel(true);
  });

  it('should display api protocol in table row', () => {
    servingRuntimes.getRowById('template-1').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.getRowById('template-2').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.GRPC);
    servingRuntimes.getRowById('template-3').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.getRowById('template-4').shouldHaveAPIProtocol(ServingRuntimeAPIProtocol.REST);
  });

  it('should add a new serving runtime', () => {
    servingRuntimes.findAddButton().click();
    cy.get('h1').should('contain', 'Add serving runtime');

    // Check serving runtime dropdown list
    servingRuntimes.shouldDisplayServingRuntimeValues([
      'Single-model serving platform',
      'Multi-model serving platform',
    ]);
    servingRuntimes.findSelectServingPlatformButton().click();

    // Create with single model
    servingRuntimes.findCreateButton().should('be.disabled');
    servingRuntimes.shouldSelectPlatform('Single-model serving platform');
    servingRuntimes.shouldDisplayAPIProtocolValues([
      ServingRuntimeAPIProtocol.REST,
      ServingRuntimeAPIProtocol.GRPC,
    ]);
    servingRuntimes.shouldSelectAPIProtocol(ServingRuntimeAPIProtocol.REST);
    servingRuntimes.findStartFromScratchButton().click();
    servingRuntimes.shouldEnterData();
    servingRuntimes.findCreateButton().should('be.enabled');
    servingRuntimes.findCancelButton().click();

    servingRuntimes.findAddButton().click();

    // Create with multi model
    servingRuntimes.findCreateButton().should('be.disabled');
    servingRuntimes.shouldSelectPlatform('Multi-model serving platform');
    servingRuntimes.findSelectAPIProtocolButton().should('not.be.enabled');
    servingRuntimes.findSelectAPIProtocolButton().should('include.text', 'REST');
    servingRuntimes.findStartFromScratchButton().click();
    servingRuntimes.shouldEnterData();
    servingRuntimes.findCreateButton().should('be.enabled');
  });

  it('should duplicate a serving runtime', () => {
    cy.get('[aria-label="Kebab toggle"]').first().click();
    cy.get('[role="menuitem"]').contains('Duplicate').click();
    cy.get('h1').should('contain', 'Duplicate serving runtime');
  });

  it('should edit a serving runtime', () => {
    cy.get('[aria-label="Kebab toggle"]').first().click();
    cy.get('[role="menuitem"]').contains('Edit').click();
    cy.get('h1').should('contain', 'Edit Multi Platform');
  });
});
