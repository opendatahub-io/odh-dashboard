import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PodKind } from '@odh-dashboard/k8s-core';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import type { ClaimDisplayState } from '../ClaimItem';
import ClaimsSection, { getGroupDisplayKind, getGroupSummary } from '../ClaimsSection';
import type { DraLookups, WorkloadClaimGroup } from '../types';
import { resolveWorkloadClaims } from '../workloadClaims';

const NAMESPACE = 'test-project';
const POD = 'test-pod';
const TEMPLATE = 'gpu-template';
const GENERATED_RC = 'test-pod-gpu-abc12';
const DIRECT_RC = 'shared-gpu';
const REQUESTED_CLASS = 'gpu.example.com';
const REQUESTS = [{ name: 'gpu', exactly: { deviceClassName: REQUESTED_CLASS, count: 1 } }];
const RESULT = { request: 'gpu', driver: 'driver.example.com', pool: 'pool-a', device: 'gpu-0' };
const SECOND_RESULT = {
  request: 'gpu',
  driver: 'driver.example.com',
  pool: 'pool-b',
  device: 'gpu-1',
};

const EMPTY: DraLookups = { claims: {}, templates: {} };

const templatePod = (overrides: Partial<Parameters<typeof mockPodK8sResource>[0]> = {}): PodKind =>
  mockPodK8sResource({
    name: POD,
    nodeName: 'worker-1',
    resourceClaims: [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
    containerClaims: [{ name: 'gpu' }],
    ...overrides,
  });

const groupFor = (
  source: { pod: PodKind } | { spec: PodKind['spec'] },
  lookups: DraLookups,
  containerNames = [POD],
): WorkloadClaimGroup => resolveWorkloadClaims(source, lookups, { containerNames });

const renderSection = (groups: WorkloadClaimGroup[], props = {}) =>
  render(
    <ClaimsSection
      groups={groups}
      namespace={NAMESPACE}
      containerNames={[POD]}
      containerLabel="workbench container"
      {...props}
    />,
  );

const allocatedLookups = (name = GENERATED_RC, results = [RESULT]): DraLookups => ({
  claims: {
    [name]: {
      status: 'loaded',
      resource: mockResourceClaim({ name, requests: REQUESTS, allocationResults: results }),
    },
  },
  templates: {},
});

const templateLookups = (state: DraLookups['templates'][string]): DraLookups => ({
  claims: {},
  templates: { [TEMPLATE]: state },
});

describe('ClaimsSection', () => {
  it('should render a running generated claim as allocated with details collapsed', async () => {
    renderSection([groupFor({ pod: templatePod() }, allocatedLookups())]);

    expect(screen.getByTestId('claims-section-title')).toHaveTextContent('Claims');
    expect(screen.getByTestId('claim-item-gpu-name')).toHaveTextContent(`gpu: ${TEMPLATE}`);
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent('1 allocated device');
    expect(screen.getByTestId('claim-item-gpu-pod')).toHaveTextContent(`Pod: ${POD}`);
    expect(screen.queryByTestId('claim-item-gpu-consumers')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-requests')).not.toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-details')).not.toBeVisible();

    await userEvent.click(screen.getByTestId('claim-item-gpu-details-toggle'));

    const details = screen.getByTestId('claim-item-gpu-details');
    expect(details).toBeVisible();
    // The class comes from the request; the allocation result only carries driver, pool, device.
    expect(within(details).getByText('Requested device class')).toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-device-0-class')).toHaveTextContent(REQUESTED_CLASS);
    expect(screen.getByTestId('claim-item-gpu-device-0-driver')).toHaveTextContent(RESULT.driver);
    expect(screen.getByTestId('claim-item-gpu-device-0-pool')).toHaveTextContent(RESULT.pool);
    expect(screen.getByTestId('claim-item-gpu-device-0-device')).toHaveTextContent(RESULT.device);
    expect(screen.getByTestId('claim-item-gpu-node')).toHaveTextContent('worker-1');
    expect(screen.getByTestId('claim-item-gpu-claim')).toHaveTextContent(GENERATED_RC);

    await userEvent.click(screen.getByTestId('claim-item-gpu-details-toggle'));
    expect(screen.getByTestId('claim-item-gpu-details')).not.toBeVisible();
  });

  it('should expand and collapse allocation details with the keyboard', async () => {
    renderSection([groupFor({ pod: templatePod() }, allocatedLookups())]);

    const toggle = screen.getByTestId('claim-item-gpu-details-toggle').closest('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // The toggle names the region that holds the allocation rows.
    const region = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
    expect(region).toContainElement(screen.getByTestId('claim-item-gpu-details'));

    toggle?.focus();
    expect(toggle).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('claim-item-gpu-details')).toBeVisible();

    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('claim-item-gpu-details')).not.toBeVisible();
    expect(toggle).toHaveFocus();
  });

  it('should list every allocated device of a claim', async () => {
    renderSection([
      groupFor({ pod: templatePod() }, allocatedLookups(GENERATED_RC, [RESULT, SECOND_RESULT])),
    ]);

    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent('2 allocated devices');
    await userEvent.click(screen.getByTestId('claim-item-gpu-details-toggle'));

    const details = screen.getByTestId('claim-item-gpu-details');
    expect(within(details).getByText('Driver 1')).toBeInTheDocument();
    expect(within(details).getByText('Driver 2')).toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-device-0-pool')).toHaveTextContent(RESULT.pool);
    expect(screen.getByTestId('claim-item-gpu-device-1-pool')).toHaveTextContent(
      SECOND_RESULT.pool,
    );
    expect(screen.getByTestId('claim-item-gpu-device-1-device')).toHaveTextContent(
      SECOND_RESULT.device,
    );
  });

  it('should report an allocated claim whose consumed requests yield no devices', () => {
    const pod = templatePod({ containerClaims: [{ name: 'gpu', request: 'other' }] });
    renderSection([groupFor({ pod }, allocatedLookups())]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      'No devices were allocated for this container.',
    );
    expect(screen.getByTestId('claim-item-gpu-claim')).toHaveTextContent(`Claim: ${GENERATED_RC}`);
    expect(screen.queryByTestId('claim-item-gpu-details-toggle')).not.toBeInTheDocument();
  });

  it('should still show the claim name for a pending claim that has no requests', () => {
    const lookups: DraLookups = {
      claims: {
        [GENERATED_RC]: {
          status: 'loaded',
          resource: mockResourceClaim({ name: GENERATED_RC, requests: [] }),
        },
      },
      templates: {},
    };
    renderSection([groupFor({ pod: templatePod({ nodeName: null }) }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Pending');
    expect(screen.queryByTestId('claim-item-gpu-requests')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('claim-item-gpu-claim')).toHaveLength(1);
    expect(screen.getByTestId('claim-item-gpu-claim')).toHaveTextContent(GENERATED_RC);
  });

  it('should keep requested information inline for a pending claim without allocation rows', () => {
    const lookups: DraLookups = {
      claims: {
        [GENERATED_RC]: {
          status: 'loaded',
          resource: mockResourceClaim({ name: GENERATED_RC, requests: REQUESTS }),
        },
      },
      templates: {},
    };
    renderSection([groupFor({ pod: templatePod({ nodeName: null }) }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Pending');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      'Waiting for device allocation.',
    );
    expect(screen.getByTestId('claim-item-gpu-requests')).toBeVisible();
    expect(screen.getByTestId('claim-item-gpu-request-0-device-class')).toHaveTextContent(
      REQUESTED_CLASS,
    );
    expect(screen.getByTestId('claim-item-gpu-request-0-count')).toHaveTextContent('1');
    expect(screen.getByTestId('claim-item-gpu-request-0-filters')).toHaveTextContent('None');
    expect(screen.getByTestId('claim-item-gpu-claim')).toHaveTextContent(GENERATED_RC);
    expect(screen.getByTestId('claim-item-gpu-caption')).toHaveTextContent(
      'Allocated device details will appear when available.',
    );
    expect(screen.queryByTestId('claim-item-gpu-details-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-device-0-driver')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-node')).not.toBeInTheDocument();
  });

  it('should render a direct claim by its claim name', async () => {
    const pod = mockPodK8sResource({
      name: POD,
      resourceClaims: [{ name: 'shared', resourceClaimName: DIRECT_RC }],
      containerClaims: [{ name: 'shared' }],
    });
    renderSection([groupFor({ pod }, allocatedLookups(DIRECT_RC))]);

    expect(screen.getByTestId('claim-item-shared-name')).toHaveTextContent(`shared: ${DIRECT_RC}`);
    expect(screen.getByTestId('claim-item-shared-status')).toHaveTextContent('Allocated');
    await userEvent.click(screen.getByTestId('claim-item-shared-details-toggle'));
    expect(screen.getByTestId('claim-item-shared-claim')).toHaveTextContent(DIRECT_RC);
  });

  it('should render every declared claim', () => {
    const pod = mockPodK8sResource({
      name: POD,
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'shared', resourceClaimName: DIRECT_RC },
      ],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
      containerClaims: [{ name: 'gpu' }, { name: 'shared' }],
    });
    const lookups: DraLookups = {
      claims: { ...allocatedLookups().claims, ...allocatedLookups(DIRECT_RC).claims },
      templates: {},
    };
    renderSection([groupFor({ pod }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-shared-status')).toHaveTextContent('Allocated');
  });

  it('should keep a loaded claim when a sibling lookup is forbidden', () => {
    const pod = mockPodK8sResource({
      name: POD,
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'shared', resourceClaimName: DIRECT_RC },
      ],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
      containerClaims: [{ name: 'gpu' }, { name: 'shared' }],
    });
    const lookups: DraLookups = {
      claims: { ...allocatedLookups().claims, [DIRECT_RC]: { status: 'forbidden' } },
      templates: {},
    };
    renderSection([groupFor({ pod }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-shared-name')).toHaveTextContent(`shared: ${DIRECT_RC}`);
    expect(screen.getByTestId('claim-item-shared-status')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('claim-item-shared-summary')).toHaveTextContent(
      `You do not have permission to view this claim in the ${NAMESPACE} project.`,
    );
    expect(screen.getByTestId('claim-item-shared-claim')).toHaveTextContent(`Claim: ${DIRECT_RC}`);
    expect(screen.queryByTestId('claim-item-shared-details-toggle')).not.toBeInTheDocument();
  });

  it.each<[string, DraLookups['claims'][string]]>([
    ['missing', { status: 'missing' }],
    ['forbidden', { status: 'forbidden' }],
    ['error', { status: 'error', error: new Error('boom') }],
  ])('should keep the generated claim name visible when the lookup is %s', (_s, state) => {
    renderSection([
      groupFor({ pod: templatePod() }, { claims: { [GENERATED_RC]: state }, templates: {} }),
    ]);

    expect(screen.getByTestId('claim-item-gpu-name')).toHaveTextContent(`gpu: ${TEMPLATE}`);
    expect(screen.getByTestId('claim-item-gpu-claim')).toHaveTextContent(`Claim: ${GENERATED_RC}`);
  });

  it('should keep loaded claims and tell 404, 403 and other failures apart within one row', () => {
    const pod = mockPodK8sResource({
      name: POD,
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'gone', resourceClaimName: 'gone-rc' },
        { name: 'denied', resourceClaimName: 'denied-rc' },
        { name: 'broken', resourceClaimName: 'broken-rc' },
      ],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
      containerClaims: [{ name: 'gpu' }, { name: 'gone' }, { name: 'denied' }, { name: 'broken' }],
    });
    const lookups: DraLookups = {
      claims: {
        ...allocatedLookups().claims,
        'gone-rc': { status: 'missing' },
        'denied-rc': { status: 'forbidden' },
        'broken-rc': { status: 'error', error: new Error('boom') },
      },
      templates: {},
    };
    renderSection([groupFor({ pod }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-gpu-details-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gone-status')).toHaveTextContent('Missing');
    expect(screen.getByTestId('claim-item-gone-summary')).toHaveTextContent(
      `Claim not found in the ${NAMESPACE} project.`,
    );
    expect(screen.getByTestId('claim-item-denied-status')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('claim-item-denied-summary')).toHaveTextContent(
      `You do not have permission to view this claim in the ${NAMESPACE} project.`,
    );
    expect(screen.getByTestId('claim-item-broken-status')).toHaveTextContent('Error');
    expect(screen.getByTestId('claim-item-broken-summary')).toHaveTextContent(
      'Claim could not be loaded: boom',
    );
    // Every failed claim keeps its reference and claim name.
    expect(screen.getByTestId('claim-item-gone-claim')).toHaveTextContent('Claim: gone-rc');
    expect(screen.getByTestId('claim-item-denied-claim')).toHaveTextContent('Claim: denied-rc');
    expect(screen.getByTestId('claim-item-broken-claim')).toHaveTextContent('Claim: broken-rc');
    expect(screen.queryByTestId('claims-section-error')).not.toBeInTheDocument();
  });

  it('should keep the allocation visible when the template was removed after allocation', () => {
    const lookups: DraLookups = {
      ...allocatedLookups(),
      templates: { [TEMPLATE]: { status: 'missing' } },
    };
    renderSection([groupFor({ pod: templatePod() }, lookups)]);

    expect(screen.getByTestId('claim-item-gpu-name')).toHaveTextContent(`gpu: ${TEMPLATE}`);
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent('1 allocated device');
    expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
  });

  it('should distinguish a missing claim template from a forbidden one', () => {
    const pod = templatePod({ resourceClaimStatuses: undefined });
    const { rerender } = renderSection([groupFor({ pod }, templateLookups({ status: 'missing' }))]);
    expect(screen.getByTestId('claim-item-gpu-name')).toHaveTextContent(`gpu: ${TEMPLATE}`);
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Missing');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      `Claim template not found in the ${NAMESPACE} project.`,
    );

    rerender(
      <ClaimsSection
        groups={[groupFor({ pod }, templateLookups({ status: 'forbidden' }))]}
        namespace={NAMESPACE}
      />,
    );
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      `You do not have permission to view this claim template in the ${NAMESPACE} project.`,
    );
  });

  it('should show a lookup error with its message', () => {
    renderSection([
      groupFor(
        { pod: templatePod() },
        {
          claims: { [GENERATED_RC]: { status: 'error', error: new Error('boom') } },
          templates: {},
        },
      ),
    ]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Error');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      'Claim could not be loaded: boom',
    );
  });

  it('should show a loading label while a lookup is in flight', () => {
    renderSection([groupFor({ pod: templatePod() }, EMPTY)]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Loading');
    expect(screen.queryByTestId('claim-item-gpu-details-toggle')).not.toBeInTheDocument();
  });

  it('should show only declared references and requests inline when there is no Pod', () => {
    const { spec } = templatePod();
    renderSection([
      groupFor(
        { spec },
        templateLookups({
          status: 'loaded',
          resource: mockResourceClaimTemplate({ name: TEMPLATE, requests: REQUESTS }),
        }),
      ),
    ]);

    expect(screen.getByTestId('claim-item-gpu-name')).toHaveTextContent(`gpu: ${TEMPLATE}`);
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('No running pod');
    expect(screen.queryByTestId('claim-item-gpu-pod')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-issue')).not.toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-request-0-device-class')).toHaveTextContent(
      REQUESTED_CLASS,
    );
    expect(screen.getByTestId('claim-item-gpu-caption')).toHaveTextContent(
      'Devices are allocated when the pod is running.',
    );
    expect(screen.queryByTestId('claim-item-gpu-details-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-claim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-node')).not.toBeInTheDocument();
  });

  it('should show an unknown Pod state with the requested rows when the Pod list failed', () => {
    const { spec } = templatePod();
    renderSection(
      [
        groupFor(
          { spec },
          templateLookups({
            status: 'loaded',
            resource: mockResourceClaimTemplate({ name: TEMPLATE, requests: REQUESTS }),
          }),
        ),
      ],
      { podsFailed: true, isLoaded: true, loadError: new Error('pods forbidden') },
    );

    expect(screen.getByTestId('claims-section-refresh-error')).toHaveTextContent('pods forbidden');
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('claim-item-gpu-summary')).toHaveTextContent(
      'Pod details could not be loaded.',
    );
    expect(screen.queryByText('No running pod')).not.toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-request-0-device-class')).toHaveTextContent(
      REQUESTED_CLASS,
    );
    expect(screen.queryByTestId('claim-item-gpu-claim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claim-item-gpu-node')).not.toBeInTheDocument();
  });

  it.each<[string, DraLookups['templates'][string], string]>([
    ['missing', { status: 'missing' }, `Claim template not found in the ${NAMESPACE} project.`],
    [
      'forbidden',
      { status: 'forbidden' },
      `You do not have permission to view this claim template in the ${NAMESPACE} project.`,
    ],
    [
      'error',
      { status: 'error', error: new Error('boom') },
      'Claim template could not be loaded: boom',
    ],
  ])('should note a %s template beside the no-Pod state', (_s, state, note) => {
    const { spec } = templatePod();
    renderSection([groupFor({ spec }, templateLookups(state))]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('No running pod');
    expect(screen.getByTestId('claim-item-gpu-issue')).toHaveTextContent(note);
    expect(screen.queryByTestId('claim-item-gpu-requests')).not.toBeInTheDocument();
  });

  it('should still render a claim no filtered container uses, with a note', () => {
    const pod = templatePod({ containerClaims: undefined });
    pod.spec.containers[1].resources = { claims: [{ name: 'gpu' }] };
    renderSection([groupFor({ pod }, allocatedLookups())]);

    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
    expect(screen.getByTestId('claim-item-gpu-consumers')).toHaveTextContent(
      'Not used by the workbench container.',
    );
  });

  it('should list the containers when more than one uses the claim', () => {
    const pod = templatePod();
    pod.spec.containers[1].resources = { claims: [{ name: 'gpu' }] };
    renderSection([groupFor({ pod }, allocatedLookups())]);

    expect(screen.getByTestId('claim-item-gpu-consumers')).toHaveTextContent(
      `Used by: ${POD}, kube-rbac-proxy`,
    );
  });

  it('should show a spinner while loading and an alert on a load error', () => {
    const { rerender } = renderSection([], { isLoading: true });
    expect(screen.getByTestId('claims-section-loading')).toBeInTheDocument();

    rerender(
      <ClaimsSection
        groups={[]}
        namespace={NAMESPACE}
        isLoaded={false}
        loadError={new Error('pods failed')}
      />,
    );
    expect(screen.getByTestId('claims-section-error')).toHaveTextContent('pods failed');
    expect(screen.queryByTestId('claims-section-empty')).not.toBeInTheDocument();
  });

  it('should keep loaded claims visible under a warning when a refresh fails', () => {
    renderSection([groupFor({ pod: templatePod() }, allocatedLookups())], {
      isLoaded: true,
      loadError: new Error('poll failed'),
    });

    expect(screen.getByTestId('claims-section-refresh-error')).toHaveTextContent('poll failed');
    expect(screen.queryByTestId('claims-section-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('claim-item-gpu-status')).toHaveTextContent('Allocated');
  });

  it('should add Pod headings instead of Pod lines for multiple groups', () => {
    const first = templatePod({ name: 'worker-0', uid: 'uid-0' });
    const second = templatePod({ name: 'worker-1', uid: 'uid-1' });
    const empty = mockPodK8sResource({ name: 'worker-2', uid: 'uid-2' });
    renderSection([
      groupFor({ pod: first }, allocatedLookups(), ['worker-0']),
      groupFor({ pod: second }, allocatedLookups(), ['worker-1']),
      groupFor({ pod: empty }, EMPTY, ['worker-2']),
    ]);

    expect(screen.getByTestId('claims-group-worker-0-pod')).toHaveTextContent('Pod: worker-0');
    expect(screen.getByTestId('claims-group-worker-1-pod')).toHaveTextContent('Pod: worker-1');
    expect(screen.getByTestId('claims-group-worker-2-empty')).toHaveTextContent(
      'No claims are declared.',
    );
    // The same alias in two groups gets distinct, group-prefixed item ids.
    expect(screen.getByTestId('claims-group-worker-0-item-gpu-status')).toHaveTextContent(
      'Allocated',
    );
    expect(screen.getByTestId('claims-group-worker-1-item-gpu-status')).toHaveTextContent(
      'Allocated',
    );
    expect(screen.queryByTestId('claim-item-gpu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('claims-group-worker-0-item-gpu-pod')).not.toBeInTheDocument();
  });

  it('should order inline requested rows as count, class, filters', () => {
    const { spec } = templatePod();
    renderSection([
      groupFor(
        { spec },
        templateLookups({
          status: 'loaded',
          resource: mockResourceClaimTemplate({ name: TEMPLATE, requests: REQUESTS }),
        }),
      ),
    ]);

    const terms = within(screen.getByTestId('claim-item-gpu-requests'))
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['Requested devices', 'Requested device class', 'Requested filters']);
  });

  describe('collapsible groups', () => {
    const SECOND_RC = 'worker-1-gpu-def34';
    const workerPod = (
      name: string,
      resourceClaimName: string,
      overrides: Partial<Parameters<typeof mockPodK8sResource>[0]> = {},
    ): PodKind =>
      templatePod({
        name,
        uid: name,
        resourceClaimStatuses: [{ name: 'gpu', resourceClaimName }],
        ...overrides,
      });
    const pendingLookups = (name: string): DraLookups => ({
      claims: {
        [name]: { status: 'loaded', resource: mockResourceClaim({ name, requests: REQUESTS }) },
      },
      templates: {},
    });
    const clickToggle = (groupId: string) =>
      userEvent.click(
        within(screen.getByTestId(`claims-group-${groupId}-toggle`)).getByRole('button'),
      );

    it('should collapse each Pod behind its name, status, and summary', async () => {
      renderSection(
        [
          groupFor({ pod: workerPod('worker-0', GENERATED_RC) }, allocatedLookups(), ['worker-0']),
          groupFor(
            { pod: workerPod('worker-1', SECOND_RC, { nodeName: null }) },
            pendingLookups(SECOND_RC),
            ['worker-1'],
          ),
        ],
        { collapsibleGroups: true, showTitle: false },
      );

      expect(screen.queryByTestId('claims-section-title')).not.toBeInTheDocument();
      expect(screen.getByTestId('claims-group-worker-0-pod')).toHaveTextContent('worker-0');
      expect(screen.getByTestId('claims-group-worker-0-status')).toHaveTextContent('Allocated');
      expect(screen.getByTestId('claims-group-worker-0-summary')).toHaveTextContent(
        `gpu: ${TEMPLATE} · 1 allocated device`,
      );
      expect(screen.getByTestId('claims-group-worker-1-pod')).toHaveTextContent('worker-1');
      expect(screen.getByTestId('claims-group-worker-1-status')).toHaveTextContent('Pending');
      expect(screen.getByTestId('claims-group-worker-1-summary')).toHaveTextContent(
        `gpu: ${TEMPLATE} · Pending allocation`,
      );
      // Collapsed by default: the claim items wait behind each toggle.
      expect(screen.getByTestId('claims-group-worker-0-item-gpu')).not.toBeVisible();
      expect(screen.getByTestId('claims-group-worker-1-item-gpu')).not.toBeVisible();

      const toggle = within(screen.getByTestId('claims-group-worker-0-toggle')).getByRole('button');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await clickToggle('worker-0');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      // The toggle controls the region that holds the claim items.
      const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      expect(region).toContainElement(screen.getByTestId('claims-group-worker-0-item-gpu'));
      expect(screen.getByTestId('claims-group-worker-0-item-gpu')).toBeVisible();
      expect(screen.getByTestId('claims-group-worker-0-item-gpu-status')).toHaveTextContent(
        'Allocated',
      );
      // The toggle already names the Pod, so the item carries no Pod line or heading.
      expect(screen.queryByTestId('claims-group-worker-0-item-gpu-pod')).not.toBeInTheDocument();
      expect(screen.getByTestId('claims-group-worker-1-item-gpu')).not.toBeVisible();

      await userEvent.click(screen.getByTestId('claims-group-worker-0-item-gpu-details-toggle'));
      expect(screen.getByTestId('claims-group-worker-0-item-gpu-claim')).toHaveTextContent(
        GENERATED_RC,
      );
      expect(screen.getByTestId('claims-group-worker-0-item-gpu-node')).toHaveTextContent(
        'worker-1',
      );

      // Each replica keeps its own claim.
      await clickToggle('worker-1');
      expect(screen.getByTestId('claims-group-worker-1-item-gpu')).toBeVisible();
      expect(screen.getByTestId('claims-group-worker-1-item-gpu-claim')).toHaveTextContent(
        SECOND_RC,
      );
      expect(
        screen.getByTestId('claims-group-worker-1-item-gpu-request-0-device-class'),
      ).toHaveTextContent(REQUESTED_CLASS);

      await clickToggle('worker-0');
      expect(screen.getByTestId('claims-group-worker-0-item-gpu')).not.toBeVisible();
    });

    it('should show a host-supplied Pod description after the name and omit it otherwise', () => {
      const prefill = groupFor({ pod: workerPod('prefill-0', GENERATED_RC) }, allocatedLookups(), [
        'prefill-0',
      ]);
      renderSection(
        [
          { ...prefill, pod: { ...prefill.pod, name: 'prefill-0', description: 'prefill' } },
          groupFor({ pod: workerPod('worker-1', SECOND_RC) }, pendingLookups(SECOND_RC), [
            'worker-1',
          ]),
        ],
        { collapsibleGroups: true, showTitle: false },
      );

      // The Pod name keeps its own element so hosts and tests can read it unchanged.
      expect(screen.getByTestId('claims-group-prefill-0-pod')).toHaveTextContent(/^prefill-0$/);
      expect(screen.getByTestId('claims-group-prefill-0-description')).toHaveTextContent(
        '· prefill',
      );
      expect(screen.getByTestId('claims-group-worker-1-pod')).toHaveTextContent(/^worker-1$/);
      expect(screen.queryByTestId('claims-group-worker-1-description')).not.toBeInTheDocument();
    });

    it('should use group-prefixed item ids even for a single collapsible group', () => {
      renderSection(
        [groupFor({ pod: workerPod('worker-0', GENERATED_RC) }, allocatedLookups(), ['worker-0'])],
        { collapsibleGroups: true },
      );

      expect(screen.getByTestId('claims-section-title')).toHaveTextContent('Claims');
      expect(screen.getByTestId('claims-group-worker-0-item-gpu-status')).toHaveTextContent(
        'Allocated',
      );
      expect(screen.queryByTestId('claim-item-gpu')).not.toBeInTheDocument();
    });

    it('should let a forbidden replica stand beside an allocated one', () => {
      renderSection(
        [
          groupFor({ pod: workerPod('worker-0', GENERATED_RC) }, allocatedLookups(), ['worker-0']),
          groupFor(
            { pod: workerPod('worker-1', SECOND_RC) },
            { claims: { [SECOND_RC]: { status: 'forbidden' } }, templates: {} },
            ['worker-1'],
          ),
        ],
        { collapsibleGroups: true },
      );

      expect(screen.getByTestId('claims-group-worker-0-status')).toHaveTextContent('Allocated');
      expect(screen.getByTestId('claims-group-worker-1-status')).toHaveTextContent('Unavailable');
      expect(screen.getByTestId('claims-group-worker-1-summary')).toHaveTextContent(
        `gpu: ${TEMPLATE} · Access denied`,
      );
    });

    it('should show no status label for a Pod that declares no claims', () => {
      renderSection(
        [groupFor({ pod: mockPodK8sResource({ name: 'worker-2' }) }, EMPTY, ['worker-2'])],
        { collapsibleGroups: true },
      );

      expect(screen.queryByTestId('claims-group-worker-2-status')).not.toBeInTheDocument();
      expect(screen.getByTestId('claims-group-worker-2-summary')).toHaveTextContent(
        'No claims are declared.',
      );
    });

    it('should keep the inline rendering unchanged when groups are not collapsible', () => {
      renderSection([groupFor({ pod: templatePod() }, allocatedLookups())]);

      expect(screen.getByTestId('claims-section-title')).toHaveTextContent('Claims');
      expect(screen.getByTestId('claim-item-gpu-pod')).toHaveTextContent(`Pod: ${POD}`);
      expect(screen.queryByTestId(`claims-group-${POD}-toggle`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`claims-group-${POD}-summary`)).not.toBeInTheDocument();
    });
  });

  describe('getGroupDisplayKind', () => {
    const twoClaimPod = mockPodK8sResource({
      name: POD,
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'shared', resourceClaimName: DIRECT_RC },
      ],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
      containerClaims: [{ name: 'gpu' }, { name: 'shared' }],
    });
    const withSibling = (state?: DraLookups['claims'][string]): WorkloadClaimGroup =>
      groupFor(
        { pod: twoClaimPod },
        {
          claims: { ...allocatedLookups().claims, ...(state ? { [DIRECT_RC]: state } : {}) },
          templates: {},
        },
      );

    it.each<[string, DraLookups['claims'][string] | undefined, ClaimDisplayState['kind']]>([
      ['loading', undefined, 'loading'],
      [
        'pending',
        { status: 'loaded', resource: mockResourceClaim({ name: DIRECT_RC, requests: REQUESTS }) },
        'pending',
      ],
      ['missing', { status: 'missing' }, 'missing'],
      ['forbidden', { status: 'forbidden' }, 'forbidden'],
      ['error', { status: 'error', error: new Error('boom') }, 'error'],
    ])('should let a %s sibling outrank an allocated claim', (_s, state, kind) => {
      expect(getGroupDisplayKind(withSibling(state))).toBe(kind);
    });

    it('should rank a failure above a pending sibling and report allocated only when all are', () => {
      expect(
        getGroupDisplayKind(
          groupFor(
            { pod: twoClaimPod },
            {
              claims: {
                [GENERATED_RC]: { status: 'forbidden' },
                [DIRECT_RC]: {
                  status: 'loaded',
                  resource: mockResourceClaim({ name: DIRECT_RC, requests: REQUESTS }),
                },
              },
              templates: {},
            },
          ),
        ),
      ).toBe('forbidden');
      expect(getGroupDisplayKind(withSibling(allocatedLookups(DIRECT_RC).claims[DIRECT_RC]))).toBe(
        'allocated',
      );
      expect(getGroupDisplayKind({ pod: { name: POD }, claims: [] })).toBeUndefined();
    });

    it('should summarize every claim of the Pod', () => {
      expect(getGroupSummary(withSibling({ status: 'missing' }))).toBe(
        `gpu: ${TEMPLATE} · 1 allocated device; shared: ${DIRECT_RC} · Claim not found`,
      );
      expect(getGroupSummary({ pod: { name: POD }, claims: [] })).toBe('No claims are declared.');
    });
  });
});
