import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { servingRuntimes } from '~/__tests__/cypress/cypress/pages/servingRuntimes';
import { ServingRuntimePlatform } from '~/types';

it('Custom serving runtimes', () => {
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

  // check the platform setting labels in the header
  servingRuntimes.shouldBeSingleModel(true).shouldBeMultiModel(true);

  // check the platform labels in the table row
  servingRuntimes.getRowById('template-1').shouldBeSingleModel(true).shouldBeMultiModel(true);
  servingRuntimes.getRowById('template-2').shouldBeSingleModel(true).shouldBeMultiModel(false);
  servingRuntimes.getRowById('template-3').shouldBeSingleModel(false).shouldBeMultiModel(true);
  servingRuntimes.getRowById('template-4').shouldBeSingleModel(false).shouldBeMultiModel(true);
});
