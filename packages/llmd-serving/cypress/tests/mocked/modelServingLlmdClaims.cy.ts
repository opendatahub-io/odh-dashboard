import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServicePodK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServicePodK8sResource';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { modelServingSection } from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  PodModel,
  ResourceClaimModel,
  ResourceClaimTemplateModel,
  SecretModel,
} from '@odh-dashboard/k8s-core/api/models';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import { be } from '@odh-dashboard/cypress/cypress/utils/should';
import { failOnDraInventoryRequests } from '@odh-dashboard/cypress/cypress/utils/draNetworkGuards';

const NAMESPACE = 'test-project';
const MODEL = 'dra-llmd-model';
const MODEL_DISPLAY_NAME = 'DRA llm-d Model';
const PLAIN_MODEL = 'plain-llmd-model';
const PLAIN_MODEL_DISPLAY_NAME = 'Plain llm-d Model';
const TEMPLATE = 'single-gpu';
const REQUESTED_CLASS = 'gpu.nvidia.com';
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }];
// llm-d workers are the workload Pods of one LLMInferenceService; group ids are the Pod names.
const WORKER_0 = `${MODEL}-kserve-0`;
const WORKER_1 = `${MODEL}-kserve-1`;
const UNRELATED_WORKLOAD_POD = 'other-llmd-model-kserve-0';
const ROUTER_POD = `${MODEL}-router-0`;
const LEADER_POD = `${MODEL}-kserve-mn-0`;
const MN_WORKER_POD = `${MODEL}-kserve-mn-0-1`;
const RC_0 = `${WORKER_0}-gpu-abc12`;
const RC_1 = `${WORKER_1}-gpu-def34`;
const LEADER_RC = `${LEADER_POD}-gpu-lead01`;
const MN_WORKER_RC = `${MN_WORKER_POD}-gpu-work01`;
const UNRELATED_RC = `${UNRELATED_WORKLOAD_POD}-gpu-zzz99`;
const ROUTER_RC = `${ROUTER_POD}-gpu-yyy88`;
const RESULT_0 = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-01', device: 'gpu-0' };
const RESULT_1 = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-02', device: 'gpu-3' };

const draWorkerPod = (
  name: string,
  options: Partial<Parameters<typeof mockPodK8sResource>[0]> = {},
): PodKind =>
  mockLLMInferenceServicePodK8sResource({
    llmInferenceServiceName: MODEL,
    name,
    namespace: NAMESPACE,
    nodeName: `worker-${name}`,
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    containerClaims: [{ name: 'gpu' }],
    ...options,
  });

const allocatedWorkerPod = (
  name: string,
  resourceClaimName: string,
  options: Partial<Parameters<typeof mockLLMInferenceServicePodK8sResource>[0]> = {},
): PodKind =>
  draWorkerPod(name, { resourceClaimStatuses: [{ name: 'gpu', resourceClaimName }], ...options });

// Pods the deployment must ignore: another deployment's worker, and a same-name Pod that is not a workload.
const unrelatedPods = (): PodKind[] => [
  mockLLMInferenceServicePodK8sResource({
    llmInferenceServiceName: 'other-llmd-model',
    name: UNRELATED_WORKLOAD_POD,
    namespace: NAMESPACE,
    nodeName: 'worker-unrelated',
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: UNRELATED_RC }],
    containerClaims: [{ name: 'gpu' }],
  }),
  mockPodK8sResource({
    name: ROUTER_POD,
    namespace: NAMESPACE,
    labels: { 'app.kubernetes.io/name': MODEL, 'app.kubernetes.io/component': 'router' },
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: ROUTER_RC }],
  }),
];

const initIntercepts = (pods: PodKind[]) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ disableNIMModelServing: true, disableKServe: false, disableLLMd: false }),
  );
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  );
  cy.interceptK8s(
    { model: HardwareProfileModel, ns: 'opendatahub', name: 'small-profile' },
    mockGlobalScopedHardwareProfiles[0],
  );
  cy.interceptK8sList(
    { model: SecretModel, ns: NAMESPACE },
    mockK8sResourceList([mockSecretK8sResource({ namespace: NAMESPACE })]),
  );
  cy.interceptOdh('GET /api/connection-types', []);
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
      namespace: 'opendatahub',
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKServe: true })]),
  );
  cy.interceptK8sList(
    LLMInferenceServiceModel,
    mockK8sResourceList([
      mockLLMInferenceServiceK8sResource({
        name: MODEL,
        namespace: NAMESPACE,
        displayName: MODEL_DISPLAY_NAME,
        replicas: 2,
      }),
      mockLLMInferenceServiceK8sResource({
        name: PLAIN_MODEL,
        namespace: NAMESPACE,
        displayName: PLAIN_MODEL_DISPLAY_NAME,
      }),
    ]),
  );
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: NAMESPACE },
    mockK8sResourceList([]),
  );
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([]));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
  cy.interceptK8sList(
    { model: PodModel, ns: NAMESPACE },
    mockK8sResourceList([
      ...pods,
      ...unrelatedPods(),
      mockLLMInferenceServicePodK8sResource({
        llmInferenceServiceName: PLAIN_MODEL,
        name: `${PLAIN_MODEL}-kserve-0`,
        namespace: NAMESPACE,
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

// Any RC or RCT read in the project, registered first so specific intercepts take precedence.
const interceptAnyClaimLookup = () => {
  cy.interceptK8s(
    { model: ResourceClaimModel, ns: NAMESPACE, name: '*' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getAnyClaim');
  cy.interceptK8s(
    { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: '*' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getAnyTemplate');
};

const interceptTemplate = () =>
  cy
    .interceptK8s(
      { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: TEMPLATE },
      mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE, requests: REQUESTS }),
    )
    .as('getTemplate');

const expandModelRow = (displayName: string) => {
  modelServingSection.visit(NAMESPACE);
  const row = modelServingSection.getKServeRow(displayName);
  row.findExpansion().should(be.collapsed);
  row.findToggleButton('llmd-serving').click();
  return row;
};

describe('llm-d model deployment claims', () => {
  beforeEach(() => {
    failOnDraInventoryRequests();
  });

  it('should group allocated claims per worker Pod and ignore Pods outside the workload', () => {
    initIntercepts([allocatedWorkerPod(WORKER_1, RC_1), allocatedWorkerPod(WORKER_0, RC_0)]);
    interceptClaim(RC_0, [RESULT_0]);
    interceptClaim(RC_1, [RESULT_1]);
    interceptClaim(UNRELATED_RC, [RESULT_0]);
    interceptClaim(ROUTER_RC, [RESULT_0]);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    // Existing llm-d details are untouched.
    row.findDescriptionListItem('Model server replicas').next('dd').should('have.text', '2');
    row.findDescriptionListItem('Hardware profile').next('dd').should('have.text', 'Small Profile');

    row.findClaimsSection().should('be.visible');
    row.findClaimsGroupDetail(WORKER_0, 'pod').should('have.text', WORKER_0);
    row.findClaimsGroupDetail(WORKER_0, 'status').should('have.text', 'Allocated');
    row
      .findClaimsGroupDetail(WORKER_0, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · 1 allocated device`);
    row.findClaimsGroupDetail(WORKER_1, 'pod').should('have.text', WORKER_1);
    row.findClaimsGroupDetail(WORKER_1, 'status').should('have.text', 'Allocated');
    // Only the deployment's own workload Pods become groups.
    row.findClaimsGroup(UNRELATED_WORKLOAD_POD).should('not.exist');
    row.findClaimsGroup(ROUTER_POD).should('not.exist');
    row.findClaimsGroupPodNames().should('have.length', 2);
    // Single-node Pods carry no role descriptor.
    row.findClaimsGroupDetail(WORKER_0, 'description').should('not.exist');

    row.findClaimsGroupToggle(WORKER_0).click();
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'status').should('have.text', 'Allocated');
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'details-toggle').click();
    row
      .findGroupClaimDetail(WORKER_0, 'gpu', 'device-0-class')
      .should('have.text', REQUESTED_CLASS);
    row
      .findGroupClaimDetail(WORKER_0, 'gpu', 'device-0-driver')
      .should('have.text', RESULT_0.driver);
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'device-0-pool').should('have.text', RESULT_0.pool);
    row
      .findGroupClaimDetail(WORKER_0, 'gpu', 'device-0-device')
      .should('have.text', RESULT_0.device);
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'node').should('have.text', `worker-${WORKER_0}`);
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'claim').should('have.text', RC_0);
    row.findGroupClaimItem(WORKER_1, 'gpu').should('not.be.visible');

    // The second worker keeps its own node, claim, and device.
    row.findClaimsGroupToggle(WORKER_1).click();
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'details-toggle').click();
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'device-0-pool').should('have.text', RESULT_1.pool);
    row
      .findGroupClaimDetail(WORKER_1, 'gpu', 'device-0-device')
      .should('have.text', RESULT_1.device);
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'node').should('have.text', `worker-${WORKER_1}`);
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'claim').should('have.text', RC_1);
    // The ignored Pods' claims are never read.
    cy.get(`@getClaim-${UNRELATED_RC}.all`).should('have.length', 0);
    cy.get(`@getClaim-${ROUTER_RC}.all`).should('have.length', 0);
  });

  it('should keep a multi-node leader and worker as separate groups with their roles', () => {
    initIntercepts([
      allocatedWorkerPod(LEADER_POD, LEADER_RC, {
        component: 'llminferenceservice-workload-leader',
        role: 'decode',
      }),
      allocatedWorkerPod(MN_WORKER_POD, MN_WORKER_RC, {
        component: 'llminferenceservice-workload-worker',
        role: 'decode',
      }),
    ]);
    interceptClaim(LEADER_RC, [RESULT_0]);
    interceptClaim(MN_WORKER_RC, [RESULT_1]);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${LEADER_RC}`, `@getClaim-${MN_WORKER_RC}`]);

    row.findClaimsGroupPodNames().should('have.length', 2);
    row.findClaimsGroupDetail(LEADER_POD, 'pod').should('have.text', LEADER_POD);
    row.findClaimsGroupDetail(LEADER_POD, 'description').should('have.text', ' · decode');
    row.findClaimsGroupDetail(LEADER_POD, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(MN_WORKER_POD, 'pod').should('have.text', MN_WORKER_POD);
    row.findClaimsGroupDetail(MN_WORKER_POD, 'description').should('have.text', ' · decode');
    row.findClaimsGroupDetail(MN_WORKER_POD, 'status').should('have.text', 'Allocated');

    row.findClaimsGroupToggle(MN_WORKER_POD).click();
    row.findGroupClaimDetail(MN_WORKER_POD, 'gpu', 'details-toggle').click();
    row.findGroupClaimDetail(MN_WORKER_POD, 'gpu', 'claim').should('have.text', MN_WORKER_RC);
    row
      .findGroupClaimDetail(MN_WORKER_POD, 'gpu', 'device-0-device')
      .should('have.text', RESULT_1.device);
    row.findGroupClaimItem(LEADER_POD, 'gpu').should('not.be.visible');
  });

  it('should keep an allocated worker intact beside a pending one', () => {
    initIntercepts([
      allocatedWorkerPod(WORKER_0, RC_0),
      draWorkerPod(WORKER_1, { isPending: true, nodeName: null }),
    ]);
    interceptClaim(RC_0, [RESULT_0]);
    interceptTemplate();

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, '@getTemplate']);

    row.findClaimsGroupDetail(WORKER_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(WORKER_1, 'status').should('have.text', 'Pending');
    row
      .findClaimsGroupDetail(WORKER_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Pending allocation`);

    row.findClaimsGroupToggle(WORKER_1).click();
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'status').should('have.text', 'Pending');
    row
      .findGroupClaimDetail(WORKER_1, 'gpu', 'request-0-device-class')
      .should('have.text', REQUESTED_CLASS);
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'request-0-count').should('have.text', '1');
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'details-toggle').should('not.exist');
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'claim').should('not.exist');
    cy.get('@getTemplate.all').should('have.length', 1);
  });

  it('should mark only the worker whose claim is forbidden', () => {
    initIntercepts([allocatedWorkerPod(WORKER_0, RC_0), allocatedWorkerPod(WORKER_1, RC_1)]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: RC_1 },
      { statusCode: 403, body: mock403Error({}) },
    ).as(`getClaim-${RC_1}`);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    row.findClaimsGroupDetail(WORKER_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(WORKER_1, 'status').should('have.text', 'Unavailable');
    row
      .findClaimsGroupDetail(WORKER_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Access denied`);

    row.findClaimsGroupToggle(WORKER_1).click();
    row
      .findGroupClaimDetail(WORKER_1, 'gpu', 'summary')
      .should(
        'have.text',
        `You do not have permission to view this claim in the ${NAMESPACE} project.`,
      );
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'claim').should('have.text', `Claim: ${RC_1}`);

    row.findClaimsGroupToggle(WORKER_0).click();
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'details-toggle').click();
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'claim').should('have.text', RC_0);
  });

  it('should look up claims only for an expanded DRA row and never for a non-DRA deployment', () => {
    // The DRA deployment stays collapsed, so its claim is never read either.
    initIntercepts([allocatedWorkerPod(WORKER_0, RC_0)]);
    interceptAnyClaimLookup();
    interceptClaim(RC_0, [RESULT_0]);
    interceptTemplate();

    const row = expandModelRow(PLAIN_MODEL_DISPLAY_NAME);

    row.findExpansion().should(be.expanded);
    row.findDescriptionListItem('Model server replicas').next('dd').should('have.text', '1');
    row.findDescriptionListItem('Model server size').should('exist');
    row.findDescriptionListItem('Hardware profile').next('dd').should('have.text', 'Small Profile');
    row.findClaimsSection().should('not.exist');
    cy.get(`@getClaim-${RC_0}.all`).should('have.length', 0);
    cy.get('@getTemplate.all').should('have.length', 0);
    cy.get('@getAnyClaim.all').should('have.length', 0);
    cy.get('@getAnyTemplate.all').should('have.length', 0);
  });

  it('should mark only the worker whose claim is missing', () => {
    initIntercepts([allocatedWorkerPod(WORKER_0, RC_0), allocatedWorkerPod(WORKER_1, RC_1)]);
    interceptClaim(RC_0, [RESULT_0]);
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: RC_1 },
      { statusCode: 404, body: mock404Error({}) },
    ).as(`getClaim-${RC_1}`);

    const row = expandModelRow(MODEL_DISPLAY_NAME);
    cy.wait([`@getClaim-${RC_0}`, `@getClaim-${RC_1}`]);

    row.findClaimsGroupDetail(WORKER_0, 'status').should('have.text', 'Allocated');
    row.findClaimsGroupDetail(WORKER_1, 'status').should('have.text', 'Missing');
    row
      .findClaimsGroupDetail(WORKER_1, 'summary')
      .should('have.text', `gpu: ${TEMPLATE} · Claim not found`);
    row.findClaimsSection().should('not.contain.text', 'Loading');

    row.findClaimsGroupToggle(WORKER_1).click();
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'status').should('have.text', 'Missing');
    row
      .findGroupClaimDetail(WORKER_1, 'gpu', 'summary')
      .should('have.text', `Claim not found in the ${NAMESPACE} project.`);
    row.findGroupClaimDetail(WORKER_1, 'gpu', 'claim').should('have.text', `Claim: ${RC_1}`);

    // The allocated worker is untouched by its sibling's failure.
    row.findClaimsGroupToggle(WORKER_0).click();
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'details-toggle').click();
    row.findGroupClaimDetail(WORKER_0, 'gpu', 'claim').should('have.text', RC_0);
    row.findClaimsSection().testA11y();
  });
});
