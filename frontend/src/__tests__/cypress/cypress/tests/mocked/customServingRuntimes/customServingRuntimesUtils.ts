import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import { ProjectModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockProjectK8sResource } from '~/__mocks__';

export const customServingRuntimesInitialMock = [
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

export const customServingRuntimesIntercept = (): void => {
  cy.interceptOdh(
    'GET /api/templates/:namespace',
    { path: { namespace: 'opendatahub' } },
    mockK8sResourceList(customServingRuntimesInitialMock),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
};
