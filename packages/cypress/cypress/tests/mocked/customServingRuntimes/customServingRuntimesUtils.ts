import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
  ServingRuntimePlatform,
} from '@odh-dashboard/model-serving/shared/types';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__';
import { ProjectModel, TemplateModel } from '../../../utils/models';

const mockUnsupportedAccepted = mockServingRuntimeTemplateK8sResource({
  name: 'template-unsupported-accepted',
  displayName: 'Unsupported Accepted Runtime',
  platforms: [ServingRuntimePlatform.SINGLE],
  apiProtocol: ServingRuntimeAPIProtocol.REST,
  annotations: {
    'opendatahub.io/support-status': 'unsupported',
    'opendatahub.io/unsupported-status-accepted': 'true',
  },
});

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
  mockServingRuntimeTemplateK8sResource({
    name: 'template-unsupported-unaccepted',
    displayName: 'Unsupported Unaccepted Runtime',
    platforms: [ServingRuntimePlatform.SINGLE],
    apiProtocol: ServingRuntimeAPIProtocol.REST,
    annotations: {
      'opendatahub.io/support-status': 'unsupported',
    },
    version: '0.11.0+rhai5',
  }),
  mockUnsupportedAccepted,
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

export const interceptTemplatePatch = (name: string): void => {
  cy.interceptOdh(
    'PATCH /api/templates/:namespace/:name',
    { path: { namespace: 'opendatahub', name } },
    mockServingRuntimeTemplateK8sResource({ name }),
  ).as('patchTemplate');
};

export const interceptDashboardConfigPatch = (): void => {
  cy.intercept('PATCH', '/api/dashboardConfig/opendatahub/odh-dashboard-config', {}).as(
    'patchDashboardConfig',
  );
};
