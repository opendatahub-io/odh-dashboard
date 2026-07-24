import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { initIntercepts } from './workbenchTestUtils';
import {
  ClusterQueueModel,
  EventModel,
  LocalQueueModel,
  PodModel,
  ProjectModel,
  WorkloadModel,
} from '../../../../utils/models';
import { workbenchPage, workbenchStatusModal } from '../../../../pages/workbench';

const notebookWithKueueQueue = mockNotebookK8sResource({
  lastImageSelection: 'test-imagestream:1.2',
  opts: {
    metadata: {
      name: 'test-notebook',
      labels: {
        'opendatahub.io/notebook-image': 'true',
        'kueue.x-k8s.io/queue-name': 'test-queue',
      },
      annotations: { 'opendatahub.io/image-display-name': 'Test image' },
    },
  },
});

const mockNotebookEvents = [
  {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: { name: 'ev-1', namespace: 'test-project', uid: 'ev-1-uid' },
    involvedObject: { name: 'test-notebook', kind: 'StatefulSet' },
    lastTimestamp: '2024-01-15T10:00:00Z',
    eventTime: '2024-01-15T10:00:00Z',
    type: 'Normal' as const,
    reason: 'Created',
    message: 'Created container notebook',
  },
  {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: { name: 'ev-2', namespace: 'test-project', uid: 'ev-2-uid' },
    involvedObject: { name: 'test-notebook', kind: 'StatefulSet' },
    lastTimestamp: '2024-01-15T10:01:00Z',
    eventTime: '2024-01-15T10:01:00Z',
    type: 'Normal' as const,
    reason: 'Started',
    message: 'Started container notebook',
  },
];

const initKueueEnabledForStatusModal = () => {
  initIntercepts({ notebooks: [notebookWithKueueQueue] });
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ disableKueue: false, disableProjectScoped: true }),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
        [DataScienceStackComponent.KUEUE]: { managementState: 'Unmanaged' },
      },
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKueue: true })]),
  );
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ enableKueue: true }));
  cy.interceptK8sList(
    { model: LocalQueueModel, ns: 'test-project' },
    mockK8sResourceList([
      mockLocalQueueK8sResource({ name: 'test-queue', namespace: 'test-project' }),
    ]),
  );
  cy.interceptK8s(
    { model: ClusterQueueModel, name: 'test-cluster-queue' },
    mockClusterQueueK8sResource({ name: 'test-cluster-queue' }),
  );
};

const initKueueWorkloadStatus = (
  workloadStatus: WorkloadStatusType,
  opts?: { evictionReason?: string },
) => {
  initIntercepts({ notebooks: [notebookWithKueueQueue] });
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ disableKueue: false, disableProjectScoped: true }),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
        [DataScienceStackComponent.KUEUE]: { managementState: 'Unmanaged' },
      },
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKueue: true })]),
  );
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ enableKueue: true }));
  cy.interceptK8sList(
    { model: LocalQueueModel, ns: 'test-project' },
    mockK8sResourceList([
      mockLocalQueueK8sResource({ name: 'test-queue', namespace: 'test-project' }),
    ]),
  );
  cy.interceptK8s(
    { model: ClusterQueueModel, name: 'test-cluster-queue' },
    mockClusterQueueK8sResource({ name: 'test-cluster-queue' }),
  );
  const workload = mockWorkloadK8sResource({
    k8sName: 'workload-test-notebook',
    namespace: 'test-project',
    ownerName: 'test-notebook',
    mockStatus: workloadStatus,
    evictionReason: opts?.evictionReason,
  });
  if (workload.metadata) {
    workload.metadata.labels = {
      ...workload.metadata.labels,
      'kueue.x-k8s.io/job-name': 'test-notebook',
    };
  }
  cy.interceptK8sList(
    { model: WorkloadModel, ns: 'test-project' },
    mockK8sResourceList([workload]),
  );
};

describe('Workbench page — Kueue & Status', () => {
  it('Workbench status modal shows Progress and Events log tabs; Resources tab only when Kueue enabled', () => {
    initIntercepts({});
    cy.interceptK8sList(
      { model: EventModel, ns: 'test-project' },
      mockK8sResourceList(mockNotebookEvents),
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Ready');
    notebookRow.findHaveNotebookStatusText().click();

    workbenchStatusModal.find().should('be.visible');
    workbenchStatusModal.getNotebookStatus('Ready');

    workbenchStatusModal.findProgressTab().should('be.visible').click();
    workbenchStatusModal.findProgressSteps().should('exist');

    workbenchStatusModal.findEventlogTab().should('be.visible').click();
    cy.findByTestId('event-logs').should('be.visible');

    cy.findByTestId('expand-resources').should('not.exist');
  });

  it('Resources tab is visible when Kueue is enabled and component is present', () => {
    initKueueEnabledForStatusModal();
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Ready');
    notebookRow.findHaveNotebookStatusText().click();

    workbenchStatusModal.find().should('be.visible');
    workbenchStatusModal.findProgressTab().should('be.visible');
    workbenchStatusModal.findEventlogTab().should('be.visible');
    workbenchStatusModal.findResourcesTab().should('be.visible');
  });

  it('Workbench status modal Resources tab displays cluster queue info when Kueue is enabled', () => {
    initKueueEnabledForStatusModal();
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findHaveNotebookStatusText().should('have.text', 'Ready');
    notebookRow.findHaveNotebookStatusText().click();

    workbenchStatusModal.find().should('be.visible');
    workbenchStatusModal.findResourcesTab().should('be.visible').click();

    workbenchStatusModal.findClusterQueueSection().should('be.visible');
    workbenchStatusModal.findQueueValue().should('contain.text', 'test-cluster-queue');
    workbenchStatusModal.findQuotasSection().should('be.visible');
    workbenchStatusModal.findQuotaSourceValue().should('be.visible');
  });

  describe('Kueue workbench status', () => {
    it('displays Queued when workload has QuotaReserved=False (pending)', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Pending);
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Queued');
    });

    it('displays human-readable subtitle for Queued status', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Pending);
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').find().should('contain.text', 'Waiting for');
    });

    it('displays Failed when workload has Finished with failed reason', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Failed);
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Failed');
    });

    it('displays Preempted when workload has Evicted condition with Preempted reason', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Evicted, { evictionReason: 'Preempted' });
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Preempted');
    });

    it('displays human-readable subtitle for Preempted status', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Evicted, { evictionReason: 'Preempted' });
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .find()
        .should('contain.text', 'Paused by a higher-priority job');
    });

    it('displays Evicted when workload has Evicted condition with non-preemption reason', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Evicted, {
        evictionReason: 'ClusterQueueStopped',
      });
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Evicted');
    });

    it('displays Inadmissible when workload is inadmissible', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Inadmissible);
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Inadmissible');
    });

    it('displays queue position in subtitle for Queued workload when Visibility API is available', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Pending);
      cy.intercept(
        'GET',
        '/api/k8s/apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/test-project/localqueues/test-queue/pendingworkloads',
        {
          kind: 'PendingWorkloadsSummary',
          apiVersion: 'visibility.kueue.x-k8s.io/v1beta2',
          metadata: {},
          items: [
            {
              metadata: {
                name: 'workload-test-notebook',
                namespace: 'test-project',
              },
              priority: 0,
              localQueueName: 'test-queue',
              positionInClusterQueue: 2,
              positionInLocalQueue: 2,
            },
          ],
        },
      ).as('pendingWorkloads');
      workbenchPage.visit('test-project');
      cy.wait('@pendingWorkloads');
      workbenchPage.getNotebookRow('Test Notebook').find().should('contain.text', 'position 3');
    });

    it('displays subtitle without position when Visibility API returns 403', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Pending);
      cy.intercept(
        'GET',
        '/api/k8s/apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/test-project/localqueues/test-queue/pendingworkloads',
        { statusCode: 403, body: { kind: 'Status', code: 403, message: 'Forbidden' } },
      ).as('pendingWorkloads403');
      workbenchPage.visit('test-project');
      cy.wait('@pendingWorkloads403');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .find()
        .should('contain.text', 'Waiting for')
        .and('not.contain.text', 'position');
    });

    it('Progress tab — Kueue sub-step is visible by default and toggles collapse/expand', () => {
      initKueueWorkloadStatus(WorkloadStatusType.Pending);
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      // Default: expanded — Kueue sub-step visible under "Pod assigned".
      workbenchStatusModal.findKueueSubStep().should('be.visible');
      // Click toggle to collapse.
      workbenchStatusModal.findKueueToggle().click();
      workbenchStatusModal.findKueueSubStep().should('not.be.visible');
      // Click toggle again to re-expand.
      workbenchStatusModal.findKueueToggle().click();
      workbenchStatusModal.findKueueSubStep().should('be.visible');
    });

    it('Progress tab — Queued sub-step shows "Waiting for quota in {queue}"', () => {
      // Clear the default condition message so getQueuedMessage falls back to 'Waiting for quota in test-queue'.
      const queuedWorkload = mockWorkloadK8sResource({
        k8sName: 'workload-test-notebook',
        namespace: 'test-project',
        ownerName: 'test-notebook',
        mockStatus: WorkloadStatusType.Pending,
      });
      if (queuedWorkload.status) {
        queuedWorkload.status.conditions = queuedWorkload.status.conditions?.map((c) =>
          c.type === 'QuotaReserved' ? { ...c, message: '' } : c,
        );
      }
      if (queuedWorkload.metadata) {
        queuedWorkload.metadata.labels = {
          ...queuedWorkload.metadata.labels,
          'kueue.x-k8s.io/job-name': 'test-notebook',
        };
      }
      initKueueEnabledForStatusModal();
      cy.interceptK8sList(
        { model: WorkloadModel, ns: 'test-project' },
        mockK8sResourceList([queuedWorkload]),
      );
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal
        .findProgressStepByLabel('Waiting for quota in test-queue')
        .should('exist');
    });

    it('Progress tab — Inadmissible sub-step shows "Queue {queue} does not exist"', () => {
      // Set a realistic queue-not-found message so getInadmissibleMessage returns 'Queue test-queue does not exist'.
      const inadmissibleWorkload = mockWorkloadK8sResource({
        k8sName: 'workload-test-notebook',
        namespace: 'test-project',
        ownerName: 'test-notebook',
        mockStatus: WorkloadStatusType.Inadmissible,
      });
      if (inadmissibleWorkload.status) {
        inadmissibleWorkload.status.conditions = inadmissibleWorkload.status.conditions?.map((c) =>
          c.type === 'QuotaReserved'
            ? { ...c, message: "localqueue 'test-queue' doesn't exist" }
            : c,
        );
      }
      if (inadmissibleWorkload.metadata) {
        inadmissibleWorkload.metadata.labels = {
          ...inadmissibleWorkload.metadata.labels,
          'kueue.x-k8s.io/job-name': 'test-notebook',
        };
      }
      initKueueEnabledForStatusModal();
      cy.interceptK8sList(
        { model: WorkloadModel, ns: 'test-project' },
        mockK8sResourceList([inadmissibleWorkload]),
      );
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal
        .findProgressStepByLabel('Queue test-queue does not exist')
        .should('exist');
    });

    it('Progress tab — modal title shows workbench display name', () => {
      initKueueEnabledForStatusModal();
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      // Title should be "{displayName} status", not the hardcoded "Workbench status".
      workbenchStatusModal
        .find()
        .findByTestId('notebook-status-modal-header')
        .should('contain.text', 'Test Notebook status');
    });

    it('Progress tab — no auth proxy container means no Auth proxy steps', () => {
      const notebookNoAuthProxy = mockNotebookK8sResource({
        lastImageSelection: 'test-imagestream:1.2',
        opts: {
          metadata: {
            name: 'test-notebook',
            labels: {
              'opendatahub.io/notebook-image': 'true',
              'kueue.x-k8s.io/queue-name': 'test-queue',
            },
            annotations: { 'opendatahub.io/image-display-name': 'Test image' },
          },
        },
      });
      // _.merge keeps array entries by index, so explicitly filter out auth proxy containers.
      notebookNoAuthProxy.spec.template.spec.containers =
        notebookNoAuthProxy.spec.template.spec.containers.filter(
          (c) => !['kube-rbac-proxy', 'oauth-proxy', 'ose-oauth-proxy'].includes(c.name),
        );
      initIntercepts({ notebooks: [notebookNoAuthProxy] });
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressStepByLabel('Auth proxy').should('not.exist');
    });

    it('Progress tab — AdmissionCheck status surfaces check label', () => {
      // Uses WorkloadStatusType.Admitted so the Admitted condition is present;
      // the blocking admission check then promotes the status to AdmissionCheck.
      const workloadWithAdmissionCheck = mockWorkloadK8sResource({
        k8sName: 'workload-test-notebook',
        namespace: 'test-project',
        ownerName: 'test-notebook',
        mockStatus: WorkloadStatusType.Admitted,
      });
      if (workloadWithAdmissionCheck.status) {
        workloadWithAdmissionCheck.status.admissionChecks = [
          {
            name: 'gpu-check',
            message: 'Waiting for GPU resource assignment',
            state: 'Pending',
            lastTransitionTime: '2024-01-15T10:00:00Z',
          },
        ];
      }
      if (workloadWithAdmissionCheck.metadata) {
        workloadWithAdmissionCheck.metadata.labels = {
          ...workloadWithAdmissionCheck.metadata.labels,
          'kueue.x-k8s.io/job-name': 'test-notebook',
        };
      }
      initKueueEnabledForStatusModal();
      cy.interceptK8sList(
        { model: WorkloadModel, ns: 'test-project' },
        mockK8sResourceList([workloadWithAdmissionCheck]),
      );
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressStepByLabel('Waiting for admission check').should('exist');
    });

    it('Requeued — table badge shows Requeued and modal header and progress sub-step are correct', () => {
      const requeuedWorkload = mockWorkloadK8sResource({
        k8sName: 'workload-test-notebook',
        namespace: 'test-project',
        ownerName: 'test-notebook',
        mockStatus: WorkloadStatusType.Evicted,
        evictionReason: 'PodsReadyTimeout',
        requeueState: { count: 2, requeueAt: '2026-07-15T10:05:00Z' },
      });
      if (requeuedWorkload.metadata) {
        requeuedWorkload.metadata.labels = {
          ...requeuedWorkload.metadata.labels,
          'kueue.x-k8s.io/job-name': 'test-notebook',
        };
      }
      initKueueEnabledForStatusModal();
      cy.interceptK8sList(
        { model: WorkloadModel, ns: 'test-project' },
        mockK8sResourceList([requeuedWorkload]),
      );
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHaveNotebookStatusText()
        .should('have.text', 'Requeued')
        .click();
      workbenchStatusModal.find().should('contain.text', 'attempt 2');
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressStepByLabel('Re-queued').should('exist');
    });

    it('Progress tab — BlockedOnPreemptionGates sub-step shows in-progress label', () => {
      const blockedWorkload = mockWorkloadK8sResource({
        k8sName: 'workload-test-notebook',
        namespace: 'test-project',
        ownerName: 'test-notebook',
        mockStatus: WorkloadStatusType.Admitted,
      });
      if (blockedWorkload.status) {
        blockedWorkload.status.conditions = [
          ...(blockedWorkload.status.conditions ?? []),
          {
            lastTransitionTime: '2024-01-15T10:00:00Z',
            message: 'Waiting for preemption gates to clear',
            reason: 'BlockedOnPreemptionGates',
            status: 'True',
            type: 'BlockedOnPreemptionGates',
          },
        ];
      }
      if (blockedWorkload.metadata) {
        blockedWorkload.metadata.labels = {
          ...blockedWorkload.metadata.labels,
          'kueue.x-k8s.io/job-name': 'test-notebook',
        };
      }
      initKueueEnabledForStatusModal();
      cy.interceptK8sList(
        { model: WorkloadModel, ns: 'test-project' },
        mockK8sResourceList([blockedWorkload]),
      );
      cy.interceptK8sList({ model: EventModel, ns: 'test-project' }, mockK8sResourceList([]));
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal
        .findProgressStepByLabel('Admitted but waiting for preemption gates to clear')
        .should('exist');
    });
  });

  describe('Progress tab — warning events surface container_problem step', () => {
    const makeEvent = (
      name: string,
      reason: string,
      message: string,
      type: 'Normal' | 'Warning' = 'Normal',
    ) => ({
      apiVersion: 'v1',
      kind: 'Event',
      metadata: { name, namespace: 'test-project', uid: `${name}-uid` },
      involvedObject: { name: 'test-notebook', kind: 'StatefulSet' },
      lastTimestamp: '2024-01-15T10:00:00Z',
      eventTime: '2024-01-15T10:00:00Z',
      type,
      reason,
      message,
    });

    const podLifecycleEvents = () => [
      makeEvent('ev-create', 'SuccessfulCreate', 'Created pod test-notebook-0'),
      makeEvent('ev-schedule', 'Scheduled', 'Successfully assigned test-notebook-0 to node-1'),
      makeEvent('ev-iface', 'AddedInterface', 'Add eth0'),
    ];

    it('BackOff (ImagePullBackOff) — first-time start with unavailable image tag', () => {
      // No last-activity annotation → first-time start; isRunning=false so steps stay event-driven.
      const freshNotebook = mockNotebookK8sResource({
        lastImageSelection: 'test-imagestream:1.2',
        opts: {
          metadata: {
            name: 'test-notebook',
            labels: { 'opendatahub.io/notebook-image': 'true' },
            annotations: { 'opendatahub.io/image-display-name': 'Test image' },
          },
        },
      });
      delete freshNotebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'];
      initIntercepts({ notebooks: [freshNotebook] });
      cy.interceptK8sList(
        PodModel,
        mockK8sResourceList([mockPodK8sResource({ isRunning: false })]),
      );
      cy.interceptK8sList(
        { model: EventModel, ns: 'test-project' },
        mockK8sResourceList([
          ...podLifecycleEvents(),
          makeEvent(
            'ev-backoff',
            'BackOff',
            'Back-off pulling image "quay.io/rhoai/workbench-images:pytorch-2024.1"',
            'Warning',
          ),
        ]),
      );
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressStepByLabel('Workbench requested').should('exist');
      workbenchStatusModal.findProgressStepByLabel('Pod created').should('exist');
      workbenchStatusModal.findProgressStepByLabel('Pod assigned').should('exist');
      workbenchStatusModal.findProgressStepByLabel('Starting Workbench container').should('exist');
      workbenchStatusModal
        .findProgressStepByLabel('There was a problem with the workbench container')
        .should('exist');
    });

    it('FailedMount — workbench restart while PVC is still detaching from previous pod', () => {
      // last-activity annotation present → restart; PVC multi-attach until old pod releases the lock.
      initIntercepts({});
      cy.interceptK8sList(
        PodModel,
        mockK8sResourceList([mockPodK8sResource({ isRunning: false })]),
      );
      cy.interceptK8sList(
        { model: EventModel, ns: 'test-project' },
        mockK8sResourceList([
          ...podLifecycleEvents(),
          makeEvent(
            'ev-mount',
            'FailedMount',
            'Unable to attach or mount volumes: multi-attach error for volume "pvc-abc123": ' +
              "Volume is already exclusively attached to one node and can't be attached to another",
            'Warning',
          ),
        ]),
      );
      workbenchPage.visit('test-project');
      workbenchPage.getNotebookRow('Test Notebook').findHaveNotebookStatusText().click();
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressStepByLabel('Workbench requested').should('exist');
      workbenchStatusModal.findProgressStepByLabel('Pod created').should('exist');
      workbenchStatusModal.findProgressStepByLabel('Pod assigned').should('exist');
      workbenchStatusModal
        .findProgressStepByLabel('Restarting Workbench container')
        .should('exist');
      workbenchStatusModal
        .findProgressStepByLabel('There was a problem with the workbench container')
        .should('exist');
    });
  });
});
