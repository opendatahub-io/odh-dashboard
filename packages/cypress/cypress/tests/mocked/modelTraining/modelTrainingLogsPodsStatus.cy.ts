/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockPodLogs } from '@odh-dashboard/internal/__mocks__';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  ClusterQueueModel,
  LocalQueueModel,
  WorkloadModel,
} from '@odh-dashboard/k8s-core/api/models';
import { TrainJobModel } from '@odh-dashboard/internal/api/models';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import {
  projectName,
  mockTrainJobs,
  mockLocalQueues,
  mockWorkloads,
  initInterceptsForStatusModal,
  initIntercepts,
} from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobPodsTab,
  trainingJobLogsTab,
  trainingJobStatusModal,
} from '../../../pages/modelTraining';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { tablePagination } from '../../../pages/components/Pagination';
import { PodModel } from '../../../utils/models';

describe('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  describe('Pods Tab', () => {
    const mockPods = [
      mockPodK8sResource({
        name: 'image-classification-job-worker-0',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-1',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-2',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-initializer-0',
        namespace: projectName,
        isRunning: false,
        isPending: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
    ];

    it('should display training pods in Pods tab', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
          queryParams: { labelSelector: 'jobset.sigs.k8s.io/jobset-name=image-classification-job' },
        },
        mockK8sResourceList(mockPods),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Pods');

      trainingJobPodsTab.findInitializersSection().should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-initializer-0').should('exist');

      trainingJobPodsTab.findTrainingPodsSection().should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-0').should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-1').should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-2').should('exist');
    });

    it('should display pod status icons correctly', () => {
      initIntercepts();

      const mixedStatusPods = [
        mockPodK8sResource({
          name: 'running-pod',
          namespace: projectName,
          isRunning: true,
        }),
        mockPodK8sResource({
          name: 'pending-pod',
          namespace: projectName,
          isRunning: false,
          isPending: true,
        }),
      ];

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
          queryParams: {
            labelSelector: 'jobset.sigs.k8s.io/jobset-name=image-classification-job',
          },
        },
        mockK8sResourceList(mixedStatusPods),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Pods');

      trainingJobPodsTab.findPodByName('running-pod').should('exist');
      trainingJobPodsTab.findPodByName('pending-pod').should('exist');
    });
  });

  describe('Logs Tab', () => {
    const mockTrainingPods = [
      mockPodK8sResource({
        name: 'image-classification-job-worker-0',
        namespace: projectName,
        isRunning: true,
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-1',
        namespace: projectName,
        isRunning: true,
      }),
    ];

    it('should display logs for selected pod', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findLogViewer().should('exist');
      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'sample log for namespace test-model-training-project');
    });

    it('should allow switching between pods in log viewer', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-1',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-1',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-1',
          containerName: 'image-classification-job-worker-1',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'pod name image-classification-job-worker-0');

      trainingJobLogsTab.selectPod('image-classification-job-worker-1');

      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'pod name image-classification-job-worker-1');
    });

    it('should show empty state when no pods available for logs', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
          queryParams: { labelSelector: 'jobset.sigs.k8s.io/jobset-name=image-classification-job' },
        },
        mockK8sResourceList([]),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findEmptyState().should('contain', 'No pods found');
    });

    it('should enable download button when logs are loaded', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findDownloadButton().should('exist');
      trainingJobLogsTab.findDownloadButton().should('not.be.disabled');
    });

    it('should display loading state while fetching logs', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        {
          delay: 2000,
          body: mockPodLogs({
            namespace: projectName,
            podName: 'image-classification-job-worker-0',
            containerName: 'image-classification-job-worker-0',
          }),
        },
      ).as('fetchLogs');

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findLoadingSpinner().should('exist');

      cy.wait('@fetchLogs');
      trainingJobLogsTab.findLoadingSpinner().should('not.exist');
    });
  });

  describe('Training Job Status Modal', () => {
    beforeEach(() => {
      initIntercepts();

      // Set up Workload list intercepts with label selectors for each job
      // This handles requests from getWorkloadForTrainJob which uses label selectors
      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );

        if (matchingWorkload && job.metadata.uid) {
          // Intercept for UID-based selector (most common)
          cy.interceptK8sList(
            {
              model: WorkloadModel,
              ns: projectName,
              queryParams: {
                labelSelector: `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
              },
            },
            mockK8sResourceList([matchingWorkload]),
          );
        }

        if (matchingWorkload) {
          // Intercept for name-based selector (fallback)
          cy.interceptK8sList(
            {
              model: WorkloadModel,
              ns: projectName,
              queryParams: {
                labelSelector: `kueue.x-k8s.io/job-name=${job.metadata.name}`,
              },
            },
            mockK8sResourceList([matchingWorkload]),
          );
        }
      });

      // Set up status modal intercepts for all jobs
      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );
        initInterceptsForStatusModal(
          job.metadata.name,
          job.metadata.namespace || projectName,
          job.metadata.uid,
          matchingWorkload?.metadata.name,
          matchingWorkload?.metadata.uid,
        );
      });
    });

    it('should open status modal when clicking on status label', () => {
      modelTrainingGlobal.visit(projectName);
      trainingJobTable.findTable().should('be.visible');

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().should('be.visible').click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findTitle().should('be.visible');
      trainingJobStatusModal.findStatusLabel().should('be.visible');
    });

    it('should display Progress tab with tree view sections', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findProgressTab().should('be.visible');

      trainingJobStatusModal.getModal().then(($modal) => {
        if ($modal.find('[data-testid="initialization-section"]').length > 0) {
          trainingJobStatusModal.findInitializationSection().should('be.visible');
        }
        if ($modal.find('[data-testid="training-section"]').length > 0) {
          trainingJobStatusModal.findTrainingSection().should('be.visible');
        }
      });
    });

    it('should switch between Progress and Events log tabs', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();

      trainingJobStatusModal.findProgressTab().should('have.attr', 'aria-selected', 'true');
      trainingJobStatusModal.selectTab('Events log');
      trainingJobStatusModal.findEventsLogTab().should('have.attr', 'aria-selected', 'true');
      trainingJobStatusModal.selectTab('Progress');
      trainingJobStatusModal.findProgressTab().should('have.attr', 'aria-selected', 'true');
    });

    it('should show Events log tab content', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.selectTab('Events log');
      trainingJobStatusModal.findEventLogs().should('be.visible');
    });

    it('should display delete button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findDeleteButton().should('be.visible');
      trainingJobStatusModal.findDeleteButton().should('contain', 'Delete job');
    });

    it('should open delete modal when clicking delete button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findDeleteButton().click();

      deleteModal.shouldBeOpen();
    });

    it('should close modal when clicking close button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.close();
      trainingJobStatusModal.shouldBeOpen(false);
    });

    it('should display correct status in modal header', () => {
      modelTrainingGlobal.visit(projectName);

      const runningRow = trainingJobTable.getTableRow('image-classification-job');
      runningRow.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING);
      trainingJobStatusModal.close();
      const failedRow = trainingJobTable.getTableRow('failed-training-job');
      failedRow.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.FAILED);
    });

    it('should show tree view sections for jobs with initializers', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.selectTab('Progress');
      trainingJobStatusModal.getModal().find('[role="tree"]').should('exist');
    });

    describe('Status-specific behavior', () => {
      // Create separate mocks for status-specific tests only
      const statusSpecificJobs = mockTrainJobK8sResourceList([
        {
          name: 'queued-training-job',
          namespace: projectName,
          status: TrainingJobState.QUEUED,
          numNodes: 2,
          localQueueName: 'queued-queue',
          creationTimestamp: '2024-01-19T10:00:00Z',
        },
        {
          name: 'pending-training-job',
          namespace: projectName,
          status: TrainingJobState.PENDING,
          numNodes: 2,
          localQueueName: 'pending-queue',
          creationTimestamp: '2024-01-19T11:00:00Z',
        },
        {
          name: 'paused-status-training-job',
          namespace: projectName,
          status: TrainingJobState.PAUSED,
          numNodes: 2,
          localQueueName: 'paused-queue',
          creationTimestamp: '2024-01-19T12:00:00Z',
          suspend: true,
        },
        {
          name: 'preempted-training-job',
          namespace: projectName,
          status: TrainingJobState.PREEMPTED,
          numNodes: 2,
          localQueueName: 'preempted-queue',
          creationTimestamp: '2024-01-19T13:00:00Z',
        },
        {
          name: 'inadmissible-training-job',
          namespace: projectName,
          status: TrainingJobState.INADMISSIBLE,
          numNodes: 2,
          localQueueName: 'inadmissible-queue',
          creationTimestamp: '2024-01-19T14:00:00Z',
        },
        {
          name: 'deleting-training-job',
          namespace: projectName,
          status: TrainingJobState.DELETING,
          numNodes: 2,
          localQueueName: 'deleting-queue',
          creationTimestamp: '2024-01-19T15:00:00Z',
        },
      ]);

      const statusSpecificQueues = [
        {
          ...mockLocalQueueK8sResource({
            name: 'queued-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'queued-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'pending-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'pending-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'paused-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'paused-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'preempted-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'preempted-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'inadmissible-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'inadmissible-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'deleting-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'deleting-cluster-queue',
          },
        },
      ];

      const statusSpecificStatusMap: Record<string, TrainingJobState> = {
        'queued-training-job': TrainingJobState.QUEUED,
        'pending-training-job': TrainingJobState.PENDING,
        'paused-status-training-job': TrainingJobState.PAUSED,
        'preempted-training-job': TrainingJobState.PREEMPTED,
        'inadmissible-training-job': TrainingJobState.INADMISSIBLE,
        'deleting-training-job': TrainingJobState.DELETING,
      };

      const statusSpecificWorkloads = statusSpecificJobs.map((job) => {
        const jobStatus = statusSpecificStatusMap[job.metadata.name] ?? TrainingJobState.RUNNING;
        let workloadStatus = WorkloadStatusType.Running;
        let workloadSpec = { active: true };

        if (jobStatus === TrainingJobState.QUEUED) {
          workloadStatus = WorkloadStatusType.Admitted;
        } else if (jobStatus === TrainingJobState.PENDING) {
          workloadStatus = WorkloadStatusType.Pending;
        } else if (jobStatus === TrainingJobState.PAUSED) {
          workloadStatus = WorkloadStatusType.Running;
          workloadSpec = { active: false };
        } else if (jobStatus === TrainingJobState.PREEMPTED) {
          workloadStatus = WorkloadStatusType.Evicted;
        } else if (jobStatus === TrainingJobState.INADMISSIBLE) {
          workloadStatus = WorkloadStatusType.Inadmissible;
        } else if (jobStatus === TrainingJobState.DELETING) {
          workloadStatus = WorkloadStatusType.Running;
        }

        const workload = mockWorkloadK8sResource({
          k8sName: `workload-${job.metadata.name}`,
          namespace: job.metadata.namespace,
          mockStatus: workloadStatus,
        });

        if (!workload.metadata) {
          throw new Error('Workload metadata is required');
        }

        // For Queued status, we need Admitted=True but QuotaReserved=False
        if (jobStatus === TrainingJobState.QUEUED && workload.status?.conditions) {
          workload.status.conditions = [
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload is admitted',
              reason: 'Admitted',
              status: 'True',
              type: 'Admitted',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Waiting for resources',
              reason: '',
              status: 'False',
              type: 'QuotaReserved',
            },
          ];
        }

        // For Pending status, we need QuotaReserved=True but PodsReady=False
        if (jobStatus === TrainingJobState.PENDING && workload.status?.conditions) {
          workload.status.conditions = [
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Quota reserved in ClusterQueue cluster-queue',
              reason: 'QuotaReserved',
              status: 'True',
              type: 'QuotaReserved',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload is admitted',
              reason: 'Admitted',
              status: 'True',
              type: 'Admitted',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Pods are not ready yet',
              reason: 'PodsNotReady',
              status: 'False',
              type: 'PodsReady',
            },
          ];
        }

        // For Paused status, ensure workload has Admitted condition but active=false
        if (jobStatus === TrainingJobState.PAUSED && workload.status?.conditions) {
          workload.status.conditions = [
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload is admitted',
              reason: 'Admitted',
              status: 'True',
              type: 'Admitted',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Quota reserved in ClusterQueue paused-cluster-queue',
              reason: 'QuotaReserved',
              status: 'True',
              type: 'QuotaReserved',
            },
          ];
        }

        // For Preempted status, add Preempted condition
        if (jobStatus === TrainingJobState.PREEMPTED && workload.status?.conditions) {
          workload.status.conditions = [
            ...workload.status.conditions,
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload was preempted',
              reason: 'Preempted',
              status: 'True',
              type: 'Preempted',
            },
          ];
        }

        return {
          ...workload,
          spec: {
            ...workload.spec,
            ...workloadSpec,
          },
          metadata: {
            ...workload.metadata,
            labels: {
              ...(workload.metadata.labels || {}),
              'kueue.x-k8s.io/job-uid': job.metadata.uid || `uid-${job.metadata.name}`,
              'kueue.x-k8s.io/job-name': job.metadata.name,
            },
            ...(jobStatus === TrainingJobState.DELETING
              ? { deletionTimestamp: new Date().toISOString() }
              : {}),
          },
        };
      });

      beforeEach(() => {
        // First set up base intercepts
        initIntercepts();

        // Then add status-specific jobs, queues, and workloads
        const allJobs = [...mockTrainJobs, ...statusSpecificJobs];
        const allQueues = [...mockLocalQueues, ...statusSpecificQueues];
        const allWorkloads = [...mockWorkloads, ...statusSpecificWorkloads];

        // Override TrainJob list to include status-specific jobs
        cy.interceptK8sList(
          {
            model: TrainJobModel,
            ns: projectName,
          },
          mockK8sResourceList(allJobs),
        );

        // Override LocalQueue list to include status-specific queues
        cy.interceptK8sList(
          {
            model: LocalQueueModel,
            ns: projectName,
          },
          mockK8sResourceList(allQueues),
        );

        // Intercept individual status-specific queues
        statusSpecificQueues.forEach((queue) => {
          if (queue.metadata?.name) {
            cy.interceptK8s(
              {
                model: LocalQueueModel,
                ns: projectName,
                name: queue.metadata.name,
              },
              queue,
            );
          }
        });

        // Mock ClusterQueues for status-specific jobs (create with correct names)
        const statusSpecificClusterQueues = [
          mockClusterQueueK8sResource({ name: 'queued-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'pending-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'paused-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'preempted-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'inadmissible-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'deleting-cluster-queue' }),
        ];

        statusSpecificClusterQueues.forEach((clusterQueue) => {
          if (clusterQueue.metadata?.name) {
            cy.interceptK8s(
              { model: ClusterQueueModel, name: clusterQueue.metadata.name },
              clusterQueue,
            );
          }
        });

        // Override Workload list to include status-specific workloads
        // This intercept handles requests without label selectors (general list)
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
          },
          mockK8sResourceList(allWorkloads),
        );

        // Set up Workload list intercepts with label selectors for each job
        // This handles requests from getWorkloadForTrainJob which uses label selectors
        allJobs.forEach((job) => {
          const matchingWorkload = allWorkloads.find(
            (w) =>
              w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
              w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
          );

          if (matchingWorkload && job.metadata.uid) {
            // Intercept for UID-based selector (most common)
            cy.interceptK8sList(
              {
                model: WorkloadModel,
                ns: projectName,
                queryParams: {
                  labelSelector: `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
                },
              },
              mockK8sResourceList([matchingWorkload]),
            );
          }

          if (matchingWorkload) {
            // Intercept for name-based selector (fallback)
            cy.interceptK8sList(
              {
                model: WorkloadModel,
                ns: projectName,
                queryParams: {
                  labelSelector: `kueue.x-k8s.io/job-name=${job.metadata.name}`,
                },
              },
              mockK8sResourceList([matchingWorkload]),
            );
          }
        });

        // Set up status modal intercepts for ALL jobs (both original and status-specific)
        allJobs.forEach((job) => {
          const matchingWorkload = allWorkloads.find(
            (w) =>
              w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
              w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
          );
          initInterceptsForStatusModal(
            job.metadata.name,
            job.metadata.namespace || projectName,
            job.metadata.uid,
            matchingWorkload?.metadata.name,
            matchingWorkload?.metadata.uid,
          );
        });
      });

      it('should display correct status and buttons for Running job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('image-classification-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.RUNNING);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Failed job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('failed-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.FAILED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.FAILED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findRetryButton().should('be.visible');
        // trainingJobStatusModal.findRetryButton().should('contain', 'Retry Job');
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Succeeded job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('nlp-model-training');
        // Verify status in table column (UI displays "Complete" for SUCCEEDED)
        row.findStatus().should('contain', 'Complete');
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        // The UI displays "Complete" for SUCCEEDED status
        trainingJobStatusModal.getTrainingJobStatus('Complete');
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      // Helper function to navigate to page containing the job if not on current page
      const navigateToJobPage = (jobName: string) => {
        trainingJobTable.findTable().then(($table) => {
          const jobExists =
            $table
              .find(`[data-label="Name"]`)
              .filter((_, el) => Cypress.$(el).text().trim() === jobName).length > 0;

          if (!jobExists) {
            // Check if next button is enabled before clicking
            tablePagination.top.findNextButton().then(($btn) => {
              if (!$btn.is(':disabled')) {
                tablePagination.top.findNextButton().click();
                // Wait for the job to appear on the new page
                trainingJobTable.getTableRow(jobName).find().should('be.visible');
              }
            });
          }
        });
      };

      it('should display correct status and buttons for Queued job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing queued job if not on current page
        navigateToJobPage('queued-training-job');

        const row = trainingJobTable.getTableRow('queued-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.QUEUED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.QUEUED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Pending job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing pending job if not on current page
        navigateToJobPage('pending-training-job');

        const row = trainingJobTable.getTableRow('pending-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PENDING);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PENDING);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Paused job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing paused job if not on current page
        navigateToJobPage('paused-status-training-job');

        const row = trainingJobTable.getTableRow('paused-status-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PAUSED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PAUSED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Resume Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Preempted job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing preempted job if not on current page
        navigateToJobPage('preempted-training-job');

        const row = trainingJobTable.getTableRow('preempted-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PREEMPTED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PREEMPTED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Inadmissible job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing inadmissible job if not on current page
        navigateToJobPage('inadmissible-training-job');

        const row = trainingJobTable.getTableRow('inadmissible-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.INADMISSIBLE);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.INADMISSIBLE);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });
    });
  });
});
