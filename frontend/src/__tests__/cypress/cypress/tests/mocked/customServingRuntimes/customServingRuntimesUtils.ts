import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
  ServingRuntimePlatform,
} from '#~/types';
import { ProjectModel, TemplateModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockProjectK8sResource } from '#~/__mocks__';

export const customServingRuntimesInitialMock = [
  mockServingRuntimeTemplateK8sResource({
    name: 'template-1',
    displayName: 'Caikit',
    platforms: [ServingRuntimePlatform.SINGLE],
    apiProtocol: ServingRuntimeAPIProtocol.GRPC,
    modelTypes: [ServingRuntimeModelType.PREDICTIVE],
  }),
  mockServingRuntimeTemplateK8sResource({
    name: 'template-2',
    displayName: 'Serving Runtime with No Annotations',
    platforms: [],
  }),
];

export const customServingRuntimesIntercept = (): void => {
  cy.interceptK8sList(TemplateModel, mockK8sResourceList(customServingRuntimesInitialMock));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptOdh(
    'GET /api/templates/:namespace',
    { path: { namespace: 'opendatahub' } },
    mockK8sResourceList(customServingRuntimesInitialMock),
  );
};
