import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock403Error, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import type { PodKind } from '@odh-dashboard/k8s-core';
import {
  PodModel,
  ResourceClaimModel,
  ResourceClaimTemplateModel,
} from '@odh-dashboard/k8s-core/api/models';
import { initIntercepts } from './workbenchTestUtils';
import { failOnDraInventoryRequests } from '../../../../utils/draNetworkGuards';
import { NotebookModel } from '../../../../utils/models';
import { workbenchPage } from '../../../../pages/workbench';

const NAMESPACE = 'test-project';
const DRA_NOTEBOOK = 'dra-notebook';
const TEMPLATE = 'single-gpu';
const GENERATED_RC = 'dra-notebook-0-gpu-abc12';
const REQUESTED_CLASS = 'gpu.nvidia.com';
const DIRECT_RC = 'shared-gpu-claim';
const STOPPED_NOTEBOOK = 'stopped-notebook';
const RESULT = { request: 'gpu', driver: 'gpu.nvidia.com', pool: 'gpu-pool-01', device: 'gpu-0' };
const SECOND_RESULT = {
  request: 'gpu',
  driver: 'gpu.nvidia.com',
  pool: 'gpu-pool-02',
  device: 'gpu-1',
};
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }];
// The poll interval the Cypress support file injects for mock runs.
const MOCK_POLL_INTERVAL = 999999;

type ClaimsFixture = {
  /** Whether the notebook container references the declared claim. */
  claimUsedByContainer?: boolean;
  /** Extra claims declared on the Pod and the notebook beside the template claim. */
  extraClaims?: Parameters<typeof mockPodK8sResource>[0]['resourceClaims'];
  /** Replaces the DRA notebook's Pod. */
  pod?: PodKind;
};

const draPod = (options: Partial<Parameters<typeof mockPodK8sResource>[0]> = {}): PodKind =>
  mockPodK8sResource({
    name: `${DRA_NOTEBOOK}-0`,
    namespace: NAMESPACE,
    containerName: DRA_NOTEBOOK,
    nodeName: 'worker-gpu-01',
    labels: { 'notebook-name': DRA_NOTEBOOK },
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
    containerClaims: [{ name: 'gpu' }],
    ...options,
  });

const initClaimsIntercepts = ({
  claimUsedByContainer = true,
  extraClaims = [],
  pod,
}: ClaimsFixture = {}) => {
  const resourceClaims = [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }, ...extraClaims];
  const containerClaims = claimUsedByContainer
    ? resourceClaims.map(({ name }) => ({ name }))
    : undefined;
  const notebooks = [
    mockNotebookK8sResource({ name: 'test-notebook', displayName: 'Test Notebook' }),
    mockNotebookK8sResource({
      name: DRA_NOTEBOOK,
      displayName: 'DRA Notebook',
      resourceClaims,
      containerClaims,
    }),
    mockNotebookK8sResource({
      name: STOPPED_NOTEBOOK,
      displayName: 'Stopped Notebook',
      resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
      containerClaims: [{ name: 'gpu' }],
      opts: { metadata: { annotations: { 'kubeflow-resource-stopped': '2026-10-06T12:00:00Z' } } },
    }),
  ];
  initIntercepts({ mockPodList: [pod ?? draPod({ resourceClaims, containerClaims })], notebooks });
  // The table's status poll re-reads each notebook by name.
  cy.interceptK8s({ model: NotebookModel, ns: NAMESPACE, name: '*' }, (req) => {
    const name = new URL(req.url).pathname.split('/').pop();
    const notebook = notebooks.find((item) => item.metadata.name === name);
    req.reply(notebook ?? { statusCode: 404, body: mock404Error({}) });
  }).as('getNotebook');
  // The stopped workbench has no Pod; the label-selected list for it is empty.
  cy.interceptK8sList(
    {
      model: PodModel,
      ns: NAMESPACE,
      queryParams: { labelSelector: `notebook-name=${STOPPED_NOTEBOOK}` },
    },
    mockK8sResourceList([]),
  ).as('getStoppedPods');
};

const RC_ROUTE = { model: ResourceClaimModel, ns: NAMESPACE, name: GENERATED_RC };
const TEMPLATE_ROUTE = { model: ResourceClaimTemplateModel, ns: NAMESPACE, name: TEMPLATE };

const interceptAllocatedClaim = (delay = 0) =>
  cy
    .interceptK8s(RC_ROUTE, {
      body: mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        requests: REQUESTS,
        allocationResults: [RESULT],
      }),
      delay,
    })
    .as('getResourceClaim');

const expandDraRow = () => {
  workbenchPage.visit(NAMESPACE);
  const row = workbenchPage.getNotebookRow('DRA Notebook');
  row.findExpansionButton().click();
  return row;
};

describe('Workbench claims', () => {
  beforeEach(() => {
    failOnDraInventoryRequests();
  });

  it('should show an allocated claim with collapsed allocation details for a running workbench', () => {
    initClaimsIntercepts();
    cy.interceptK8s(
      RC_ROUTE,
      mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        requests: [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }],
        allocationResults: [RESULT],
      }),
    ).as('getResourceClaim');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findExpansionButton().click();
    cy.wait('@getResourceClaim');

    row.findClaimsSection().should('be.visible');
    row.findClaimItem('gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row.findClaimStatus('gpu').should('have.text', 'Allocated');
    row.findClaimSummary('gpu').should('have.text', '1 allocated device');
    row.findClaimDetail('gpu', 'pod').should('have.text', `Pod: ${DRA_NOTEBOOK}-0`);
    row.findClaimDetails('gpu').should('not.be.visible');

    row.findClaimDetailsToggle('gpu').click();
    row.findClaimDetails('gpu').should('be.visible');
    row.findClaimDetail('gpu', 'device-0-class').should('have.text', REQUESTED_CLASS);
    row.findClaimDetail('gpu', 'device-0-driver').should('have.text', RESULT.driver);
    row.findClaimDetail('gpu', 'device-0-pool').should('have.text', RESULT.pool);
    row.findClaimDetail('gpu', 'device-0-device').should('have.text', RESULT.device);
    row.findClaimDetail('gpu', 'node').should('have.text', 'worker-gpu-01');
    row.findClaimDetail('gpu', 'claim').should('have.text', GENERATED_RC);
  });

  it('should keep requested information visible while the claim is pending', () => {
    initClaimsIntercepts();
    cy.interceptK8s(
      RC_ROUTE,
      mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        requests: [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }],
      }),
    ).as('getResourceClaim');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findExpansionButton().click();
    cy.wait('@getResourceClaim');

    row.findClaimStatus('gpu').should('have.text', 'Pending');
    row.findClaimSummary('gpu').should('have.text', 'Waiting for device allocation.');
    row.findClaimDetailsToggle('gpu').should('not.exist');
    row.findClaimDetail('gpu', 'requests').should('be.visible');
    row.findClaimDetail('gpu', 'request-0-device-class').should('have.text', REQUESTED_CLASS);
    row.findClaimDetail('gpu', 'request-0-count').should('have.text', '1');
    row.findClaimDetail('gpu', 'claim').should('have.text', GENERATED_RC);
    row
      .findClaimDetail('gpu', 'caption')
      .should('have.text', 'Allocated device details will appear when available.');
    row.findClaimDetail('gpu', 'node').should('not.exist');
  });

  it('should still show a declared claim the workbench container does not use', () => {
    initClaimsIntercepts({ claimUsedByContainer: false });
    cy.interceptK8s(
      RC_ROUTE,
      mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        requests: [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }],
      }),
    ).as('getResourceClaim');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findExpansionButton().click();
    cy.wait('@getResourceClaim');

    row.findClaimItem('gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row.findClaimStatus('gpu').should('have.text', 'Pending');
    row
      .findClaimDetail('gpu', 'consumers')
      .should('have.text', 'Not used by the workbench container.');
    row.findClaimDetail('gpu', 'claim').should('have.text', GENERATED_RC);
    row.findClaimDetail('gpu', 'request-0-device-class').should('have.text', REQUESTED_CLASS);
  });

  it('should keep the claim reference and mark it unavailable when access is denied', () => {
    initClaimsIntercepts();
    cy.interceptK8s(RC_ROUTE, { statusCode: 403, body: mock403Error({}) }).as('getResourceClaim');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('DRA Notebook');
    row.findExpansionButton().click();
    cy.wait('@getResourceClaim');

    row.findClaimItem('gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row.findClaimStatus('gpu').should('have.text', 'Unavailable');
    row
      .findClaimSummary('gpu')
      .should(
        'have.text',
        `You do not have permission to view this claim in the ${NAMESPACE} project.`,
      );
  });

  it('should not show Claims or request claims for a workbench without claims', () => {
    initClaimsIntercepts();
    cy.interceptK8s(RC_ROUTE, mockResourceClaim({ name: GENERATED_RC, namespace: NAMESPACE })).as(
      'getResourceClaim',
    );
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('Test Notebook');
    row.findExpansionButton().click();
    row.findExpansion().should('be.visible');
    row.shouldHaveClusterStorageTitle();

    row.findClaimsSection().should('not.exist');
    cy.get('@getResourceClaim.all').should('have.length', 0);
  });

  it('should render a direct claim beside a template claim and mark only the missing one', () => {
    initClaimsIntercepts({ extraClaims: [{ name: 'shared', resourceClaimName: DIRECT_RC }] });
    interceptAllocatedClaim();
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: DIRECT_RC },
      { statusCode: 404, body: mock404Error({}) },
    ).as('getDirectClaim');
    // The template was removed after allocation; it is never read because the claim exists.
    cy.interceptK8s(TEMPLATE_ROUTE, { statusCode: 404, body: mock404Error({}) }).as('getTemplate');

    const row = expandDraRow();
    cy.wait(['@getResourceClaim', '@getDirectClaim']);

    row.findClaimItem('gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row.findClaimStatus('gpu').should('have.text', 'Allocated');
    row.findClaimSummary('gpu').should('have.text', '1 allocated device');
    row.findClaimItem('shared').should('contain.text', `shared: ${DIRECT_RC}`);
    row.findClaimStatus('shared').should('have.text', 'Missing');
    row
      .findClaimSummary('shared')
      .should('have.text', `Claim not found in the ${NAMESPACE} project.`);
    row.findClaimDetail('shared', 'claim').should('have.text', `Claim: ${DIRECT_RC}`);
    row.findClaimsSection().should('not.contain.text', 'Template not found');
    cy.get('@getTemplate.all').should('have.length', 0);
    cy.get('@getResourceClaim.all').should('have.length', 1);
    cy.get('@getDirectClaim.all').should('have.length', 1);
  });

  it('should list every allocated device and expand the details with the keyboard', () => {
    initClaimsIntercepts();
    cy.interceptK8s(
      RC_ROUTE,
      mockResourceClaim({
        name: GENERATED_RC,
        namespace: NAMESPACE,
        requests: [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 2 } }],
        allocationResults: [RESULT, SECOND_RESULT],
      }),
    ).as('getResourceClaim');

    const row = expandDraRow();
    cy.wait('@getResourceClaim');

    row.findClaimSummary('gpu').should('have.text', '2 allocated devices');
    row.findClaimDetailsButton('gpu').should('have.attr', 'aria-expanded', 'false');
    row.findClaimDetails('gpu').should('not.be.visible');
    // The toggle is keyboard-focusable and activating it keeps focus; Jest covers Enter/Space.
    row.findClaimDetailsButton('gpu').focus();
    cy.focused().should('have.attr', 'aria-expanded', 'false').click();
    cy.focused().should('have.attr', 'aria-expanded', 'true');
    row
      .findClaimDetailsButton('gpu')
      .invoke('attr', 'aria-controls')
      .then((contentId) => {
        row
          .findClaimDetails('gpu')
          .closest(`[id="${contentId ?? ''}"]`)
          .should('exist');
      });
    row.findClaimDetails('gpu').should('be.visible');
    row.findClaimDetail('gpu', 'device-0-device').should('have.text', RESULT.device);
    row.findClaimDetail('gpu', 'device-0-pool').should('have.text', RESULT.pool);
    row.findClaimDetail('gpu', 'device-1-device').should('have.text', SECOND_RESULT.device);
    row.findClaimDetail('gpu', 'device-1-pool').should('have.text', SECOND_RESULT.pool);
    row.findClaimDetail('gpu', 'device-1-class').should('have.text', REQUESTED_CLASS);
    row.findClaimsSection().testA11y();

    cy.focused().click();
    cy.focused().should('have.attr', 'aria-expanded', 'false');
    row.findClaimDetails('gpu').should('not.be.visible');
  });

  it('should show the requested configuration from the template for a stopped workbench', () => {
    initClaimsIntercepts();
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: '*' },
      { statusCode: 404, body: mock404Error({}) },
    ).as('getAnyClaim');
    cy.interceptK8s(
      TEMPLATE_ROUTE,
      mockResourceClaimTemplate({ name: TEMPLATE, namespace: NAMESPACE, requests: REQUESTS }),
    ).as('getTemplate');
    workbenchPage.visit(NAMESPACE);

    const row = workbenchPage.getNotebookRow('Stopped Notebook');
    row.findExpansionButton().click();
    cy.wait(['@getStoppedPods', '@getTemplate']);

    row.findClaimItem('gpu').should('contain.text', `gpu: ${TEMPLATE}`);
    row.findClaimStatus('gpu').should('have.text', 'No running pod');
    row.findClaimSummary('gpu').should('have.text', 'No pod is running for this workload.');
    row.findClaimDetail('gpu', 'request-0-count').should('have.text', '1');
    row.findClaimDetail('gpu', 'request-0-device-class').should('have.text', REQUESTED_CLASS);
    row
      .findClaimDetail('gpu', 'caption')
      .should('have.text', 'Devices are allocated when the pod is running.');
    row.findClaimDetail('gpu', 'claim').should('not.exist');
    row.findClaimDetail('gpu', 'node').should('not.exist');
    row.findClaimDetail('gpu', 'pod').should('not.exist');
    row.findClaimDetailsToggle('gpu').should('not.exist');
    cy.get('@getTemplate.all').should('have.length', 1);
    cy.get('@getAnyClaim.all').should('have.length', 0);
  });

  it('should show a loading label until the claim loads and none after a failure', () => {
    initClaimsIntercepts();
    interceptAllocatedClaim(400);

    const row = expandDraRow();
    row.findClaimStatus('gpu').should('have.text', 'Loading');
    row.findClaimSummary('gpu').should('have.text', 'Loading claim details.');
    cy.wait('@getResourceClaim');
    row.findClaimStatus('gpu').should('have.text', 'Allocated');
    row.findClaimsSection().should('not.contain.text', 'Loading');

    // A denied re-read after collapse and expand leaves no loading state behind.
    cy.interceptK8s(RC_ROUTE, { statusCode: 403, body: mock403Error({}) }).as('getDeniedClaim');
    row.findExpansionButton().click();
    row.findClaimsSection().should('not.exist');
    row.findExpansionButton().click();
    cy.wait('@getDeniedClaim');
    row.findClaimStatus('gpu').should('have.text', 'Unavailable');
    row.findClaimsLoading().should('not.exist');
    row.findClaimsSection().should('not.contain.text', 'Loading');
  });

  it('should stop reading claims once the row is collapsed', () => {
    // Only intervals are faked, so the poll can be driven without touching other timers.
    cy.clock(Date.now(), ['setInterval', 'clearInterval']);
    initClaimsIntercepts();
    interceptAllocatedClaim();

    const row = expandDraRow();
    cy.wait('@getResourceClaim');
    row.findClaimStatus('gpu').should('have.text', 'Allocated');
    // One poll interval later the expanded row reads the claim again; the table re-reads its three workbenches.
    cy.tick(MOCK_POLL_INTERVAL);
    cy.wait(['@getResourceClaim', '@getNotebook', '@getNotebook', '@getNotebook']);

    row.findExpansionButton().click();
    row.findClaimsSection().should('not.exist');
    cy.get('@getResourceClaim.all')
      .its('length')
      .then((settled) => {
        cy.tick(MOCK_POLL_INTERVAL * 2);
        // The ticks still drive the page's own polls, so a stray claim read would land before the re-expand read.
        cy.wait('@getNotebook');
        row.findExpansionButton().click();
        cy.wait('@getResourceClaim');
        cy.get('@getResourceClaim.all').should('have.length', settled + 1);
      });
  });

  it('should fit long names into a narrow viewport', () => {
    const longClaim = `${DRA_NOTEBOOK}-0-gpu-${'z'.repeat(50)}`;
    const longPool = `gpu-pool-${'p'.repeat(60)}`;
    cy.viewport(375, 812);
    initClaimsIntercepts({
      pod: draPod({
        nodeName: `worker-${'n'.repeat(60)}`,
        resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: longClaim }],
      }),
    });
    cy.interceptK8s(
      { model: ResourceClaimModel, ns: NAMESPACE, name: longClaim },
      mockResourceClaim({
        name: longClaim,
        namespace: NAMESPACE,
        requests: REQUESTS,
        allocationResults: [{ ...RESULT, pool: longPool }],
      }),
    ).as('getLongClaim');

    const row = expandDraRow();
    cy.wait('@getLongClaim');
    row.findClaimDetailsToggle('gpu').click();
    row.findClaimDetail('gpu', 'device-0-pool').should('have.text', longPool);
    row.findClaimDetail('gpu', 'claim').should('have.text', longClaim);
    row.shouldHaveClaimsWithinRow();
  });
});
