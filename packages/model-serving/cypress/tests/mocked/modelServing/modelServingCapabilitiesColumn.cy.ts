import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { modelServingGlobal } from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import { asClusterAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { MODEL_CAPABILITIES_ANNOTATION } from '../../../../src/shared/modelCapabilities';

const mockInferenceServiceWithCapabilities = (
  capabilities: string[],
  name = 'capabilities-model',
  displayName = 'Capabilities Model',
): InferenceServiceKind => {
  const isvc = mockInferenceServiceK8sResource({ name, displayName });
  isvc.metadata.annotations = {
    ...isvc.metadata.annotations,
    [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(capabilities),
  };
  return isvc;
};

const initIntercepts = ({
  modelCapabilities = false,
  inferenceServices = [mockInferenceServiceK8sResource({})],
}: {
  modelCapabilities?: boolean;
  inferenceServices?: InferenceServiceKind[];
}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      modelCapabilities,
      disableProjectScoped: true,
    }),
  );

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  );
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: undefined },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList([mockServingRuntimeK8sResource({})]),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList(inferenceServices),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: undefined },
    mockK8sResourceList(inferenceServices),
  );
};

describe('Model Serving Capabilities Column', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('should not show Capabilities column when flag is off', () => {
    initIntercepts({
      modelCapabilities: false,
      inferenceServices: [mockInferenceServiceWithCapabilities(['Vision', 'Transcription'])],
    });

    modelServingGlobal.visit('test-project');
    cy.findByTestId('deployments-table').should('exist');
    cy.findByTestId('deployments-table').find('th').contains('Capabilities').should('not.exist');
  });

  it('should show Capabilities column when flag is on', () => {
    initIntercepts({
      modelCapabilities: true,
      inferenceServices: [mockInferenceServiceWithCapabilities(['Vision', 'Transcription'])],
    });

    modelServingGlobal.visit('test-project');
    cy.findByTestId('deployments-table').should('exist');
    cy.findByTestId('deployments-table').find('th').contains('Capabilities').should('exist');
  });

  it('should render capability labels for a deployment', () => {
    initIntercepts({
      modelCapabilities: true,
      inferenceServices: [mockInferenceServiceWithCapabilities(['Vision', 'Transcription'])],
    });

    modelServingGlobal.visit('test-project');
    const row = modelServingGlobal.getDeploymentRow('Capabilities Model');
    row.findCapabilitiesGroup().should('exist');
    row.findCapabilityLabels().should('have.length', 2);
    row.findCapabilityLabels().eq(0).should('contain.text', 'Vision');
    row.findCapabilityLabels().eq(1).should('contain.text', 'Transcription');
  });

  it('should show overflow indicator when more than 2 capabilities', () => {
    initIntercepts({
      modelCapabilities: true,
      inferenceServices: [
        mockInferenceServiceWithCapabilities([
          'Vision',
          'Transcription',
          'CodeGen',
          'Summarization',
        ]),
      ],
    });

    modelServingGlobal.visit('test-project');
    const row = modelServingGlobal.getDeploymentRow('Capabilities Model');
    row.findCapabilityLabels().should('have.length', 2);
    row.findCapabilitiesCell().should('contain.text', '+2');
  });

  it('should render a dash when annotation is missing', () => {
    initIntercepts({
      modelCapabilities: true,
      inferenceServices: [mockInferenceServiceK8sResource({})],
    });

    modelServingGlobal.visit('test-project');
    const row = modelServingGlobal.getDeploymentRow('Test Inference Service');
    row.findCapabilitiesCell().findByTestId('deployment-capabilities').should('not.exist');
    row.findCapabilitiesCell().should('contain.text', '-');
  });
});
