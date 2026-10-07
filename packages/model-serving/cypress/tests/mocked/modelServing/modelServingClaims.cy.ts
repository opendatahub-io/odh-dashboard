import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { ServingRuntimePlatform } from '@odh-dashboard/model-serving/shared';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  modelServingGlobal,
  modelServingSection,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  PodModel,
  ResourceClaimModel,
  ResourceClaimTemplateModel,
  SecretModel,
} from '@odh-dashboard/k8s-core/api/models';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import { be } from '@odh-dashboard/cypress/cypress/utils/should';
import { failOnDraInventoryRequests } from '@odh-dashboard/cypress/cypress/utils/draNetworkGuards';

const NAMESPACE = 'test-project';
const MODEL = 'dra-model';
const MODEL_DISPLAY_NAME = 'DRA Model';
const PLAIN_MODEL = 'plain-model';
const PLAIN_MODEL_DISPLAY_NAME = 'Plain Model';
const TEMPLATE = 'single-gpu';
const REQUESTED_CLASS = 'gpu.nvidia.com';
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }];
const POD_0 = `${MODEL}-predictor-0`;
const POD_1 = `${MODEL}-predictor-1`;
// Group ids are the Pod names.
const GROUP_0 = POD_0;
const GROUP_1 = POD_1;
const RC_0 = `${POD_0}-gpu-abc12`;
const RC_1 = `${POD_1}-gpu-def34`;
const RESULT_0 = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-01', device: 'gpu-0' };
const RESULT_1 = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-01', device: 'gpu-1' };

const draPod = (
  name: string,
  options: Partial<Parameters<typeof mockPodK8sResource>[0]> = {},
): PodKind =>
  mockPodK8sResource({
    name,
    namespace: NAMESPACE,
    containerName: 'kserve-container',
    nodeName: `worker-${name}`,
    labels: { 'serving.kserve.io/inferenceservice': MODEL },
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    containerClaims: [{ name: 'gpu' }],
    ...options,
  });

const allocatedPod = (name: string, resourceClaimName: string): PodKind =>
  draPod(name, { resourceClaimStatuses: [{ name: 'gpu', resourceClaimName }] });

const initIntercepts = (pods: PodKind[]) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
    }),
  );
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableProjectScoped: true }));
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: NAMESPACE },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  );
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
      ],
      { namespace: 'opendatahub' },
    ),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKServe: true })]),
  );
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList([mockServingRuntimeK8sResource({ namespace: NAMESPACE })]),
  );
  cy.interceptK8sList(
    InferenceServiceModel,
    mockK8sResourceList([
      mockInferenceServiceK8sResource({
        name: MODEL,
        namespace: NAMESPACE,
        displayName: MODEL_DISPLAY_NAME,
      }),
      mockInferenceServiceK8sResource({
        name: PLAIN_MODEL,
        namespace: NAMESPACE,
        displayName: PLAIN_MODEL_DISPLAY_NAME,
      }),
    ]),
  );
  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: NAMESPACE })]),
  );
  cy.interceptOdh('GET /api/connection-types', []);
  cy.interceptK8sList(
    { model: PodModel, ns: NAMESPACE },
    mockK8sResourceList([
      ...pods,
      mockPodK8sResource({
        name: `${PLAIN_MODEL}-predictor-0`,
        namespace: NAMESPACE,
        containerName: 'kserve-container',
        labels: { 'serving.kserve.io/inferenceservice': PLAIN_MODEL },
      }),
    ]),
  ).as('getPods');
};

const interceptClaim = (name: string, allocationResults?: (typeof RESULT_0)[]) =>
  cy
    .interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name },
      mockResourceClaim({ name, namespace: NAMESPACE, requests: REQUESTS, allocationResults }),
    )
    .as(`getClaim-${name}`);

const expandModelRow = (displayName: string) => {
  modelServingGlobal.visit(NAMESPACE);
  const row = modelServingSection.getKServeRow(displayName);
  row.findExpansion().should(be.collapsed);
  row.findToggleButton().click();
  return row;
};

describe('Model deployment claims', () => {
  beforeEach(() => {
    failOnDraInventoryRequests();
  });

  it('should group allocated claims per replica Pod without merging them', () => {
    initIntercepts([allocatedPod(POD_1, RC_1), allocatedPod(POD_0, RC_0)]);
    interceptClaim(RC_0, [RESULT_0]);
    interceptClaim(RC_1, [RESULT_1]);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    // Existing details are untouched.
    row.findDescriptionListItem('Model server replicas').should('exist');
    row.findDescriptionListItem('Hardware profile').should('exist');

    row.findClaimsSection().should('be.visible');
    row.findClaimsGroupDetail(GROUP_0, 'pod').should('have.text', POD_0);
    row.findClaimsGroupDetail(GROUP_0, 'status').should('have.text', 'Allocated');
    row
      .findClaimsGroupDetail(GROUP_0, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · 1 allocated device`);
    row.findClaimsGroupDetail(GROUP_1, 'pod').should('have.text', POD_1);
    row.findClaimsGroupDetail(GROUP_1, 'status').should('have.text', 'Allocated');
    // Pod rows are collapsed by default.
    row.findGroupClaimItem(GROUP_0, 'gpu').should('not.be.visible');
    row.findGroupClaimItem(GROUP_1, 'gpu').should('not.be.visible');

    row.findClaimsGroupToggle(GROUP_0).click();
    row.findGroupClaimItem(GROUP_0, 'gpu').should('be.visible');
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'status').should('have.text', 'Allocated');
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'details-toggle').click();
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'device-0-class').should('have.text', REQUESTED_CLASS);
    row
      .findGroupClaimDetail(GROUP_0, 'gpu', 'device-0-driver')
      .should('have.text', RESULT_0.driver);
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'device-0-pool').should('have.text', RESULT_0.pool);
    row
      .findGroupClaimDetail(GROUP_0, 'gpu', 'device-0-device')
      .should('have.text', RESULT_0.device);
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'node').should('have.text', `worker-${POD_0}`);
    row.findGroupClaimDetail(GROUP_0, 'gpu', 'claim').should('have.text', RC_0);
    row.findGroupClaimItem(GROUP_1, 'gpu').should('not.be.visible');

    row.findClaimsGroupToggle(GROUP_1).click();
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'details-toggle').click();
    row
      .findGroupClaimDetail(GROUP_1, 'gpu', 'device-0-device')
      .should('have.text', RESULT_1.device);
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'node').should('have.text', `worker-${POD_1}`);
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'claim').should('have.text', RC_1);
  });

  it('should keep an allocated replica intact beside a pending one', () => {
    // The pending replica has no generated claim yet, so only its template is read.
    initIntercepts([allocatedPod(POD_0, RC_0), draPod(POD_1, { isPending: true, nodeName: null })]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: TEMPLATE },
      mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE, requests: REQUESTS }),
    ).as('getTemplate');

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, '@getTemplate']);

    row.findClaimsGroupDetail(GROUP_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(GROUP_1, 'status').should('have.text', 'Pending');
    row
      .findClaimsGroupDetail(GROUP_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Pending allocation`);

    row.findClaimsGroupToggle(GROUP_1).click();
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'status').should('have.text', 'Pending');
    row
      .findGroupClaimDetail(GROUP_1, 'gpu', 'request-0-device-class')
      .should('have.text', REQUESTED_CLASS);
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'request-0-count').should('have.text', '1');
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'details-toggle').should('not.exist');
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'claim').should('not.exist');
    cy.get('@getTemplate.all').should('have.length', 1);
  });

  it('should mark only the replica whose claim is forbidden', () => {
    initIntercepts([allocatedPod(POD_0, RC_0), allocatedPod(POD_1, RC_1)]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: RC_1 },
      { statusCode: 403, body: mock403Error({}) },
    ).as(`getClaim-${RC_1}`);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    row.findClaimsGroupDetail(GROUP_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(GROUP_1, 'status').should('have.text', 'Unavailable');
    row
      .findClaimsGroupDetail(GROUP_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Access denied`);

    row.findClaimsGroupToggle(GROUP_1).click();
    row.findGroupClaimItem(GROUP_1, 'gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row
      .findGroupClaimDetail(GROUP_1, 'gpu', 'summary')
      .should(
        'have.text',
        `You do not have permission to view this claim in the ${NAMESPACE} project.`,
      );
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'claim').should('have.text', `Claim: ${RC_1}`);
  });

  it('should leave a non-DRA deployment unchanged and request no claims', () => {
    initIntercepts([allocatedPod(POD_0, RC_0)]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: TEMPLATE },
      mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE, requests: REQUESTS }),
    ).as('getTemplate');

    const row = expandModelRow(PLAIN_MODEL_DISPLAY_NAME);

    row.findExpansion().should(be.expanded);
    row.findDescriptionListItem('Model server replicas').should('exist');
    row.findDescriptionListItem('Hardware profile').should('exist');
    row.findClaimsSection().should('not.exist');
    cy.get(`@getClaim-${RC_0}.all`).should('have.length', 0);
    cy.get('@getTemplate.all').should('have.length', 0);
  });

  it('should mark only the replica whose claim is missing', () => {
    initIntercepts([allocatedPod(POD_0, RC_0), allocatedPod(POD_1, RC_1)]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: RC_1 },
      { statusCode: 404, body: mock404Error({}) },
    ).as(`getClaim-${RC_1}`);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    row.findClaimsGroupDetail(GROUP_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(GROUP_1, 'status').should('have.text', 'Missing');
    row
      .findClaimsGroupDetail(GROUP_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Claim not found`);
    row.findClaimsSection().should('not.contain.text', 'Loading');

    // The Pod row toggle is a focusable disclosure button wired to the region it expands.
    row.findClaimsGroupToggle(GROUP_1).focus();
    cy.focused().should('have.attr', 'aria-expanded', 'false').click();
    cy.focused().should('have.attr', 'aria-expanded', 'true');
    row
      .findClaimsGroupToggle(GROUP_1)
      .invoke('attr', 'aria-controls')
      .then((contentId) => {
        row
          .findGroupClaimItem(GROUP_1, 'gpu')
          .closest(`[id="${contentId ?? ''}"]`)
          .should('exist');
      });
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'status').should('have.text', 'Missing');
    row
      .findGroupClaimDetail(GROUP_1, 'gpu', 'summary')
      .should('have.text', `Claim not found in the ${NAMESPACE} project.`);
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'claim').should('have.text', `Claim: ${RC_1}`);
    row.findGroupClaimDetail(GROUP_1, 'gpu', 'details-toggle').should('not.exist');
    row.findClaimsSection().testA11y();
  });
});
