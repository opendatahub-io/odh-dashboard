/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockPodLogs } from '@odh-dashboard/internal/__mocks__/mockPodLogs';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import {
  ClusterQueueModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { projectName, mockTrainJobs, mockWorkloads, initIntercepts } from './modelTrainingMocks';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
  trainingJobPodsTab,
  trainingJobLogsTab,
  scaleNodesModal,
} from '../../../pages/modelTraining';
import { PodModel } from '../../../utils/models';

describe('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  describe('Resources Tab', () => {
    it('should display all sections in Resources tab', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify all sections are present
      trainingJobResourcesTab.findNodeConfigurationsSection().should('exist');
      trainingJobResourcesTab.findResourcesPerNodeSection().should('exist');
      trainingJobResourcesTab.findClusterQueueSection().should('exist');
      trainingJobResourcesTab.findQuotasSection().should('exist');
    });

    it('should display correct node configuration values', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findNodesValue().should('contain', '4');
      trainingJobResourcesTab.findProcessesPerNodeValue().should('contain', '1');
      trainingJobResourcesTab.findNodesEditButton().should('exist');
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');
    });

    it('should display correct resource values', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCpuRequestsValue().should('contain', '1');
      trainingJobResourcesTab.findCpuLimitsValue().should('contain', '2');
      trainingJobResourcesTab.findMemoryRequestsValue().should('contain', '2Gi');
      trainingJobResourcesTab.findMemoryLimitsValue().should('contain', '4Gi');
    });

    it('should display cluster queue information', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQueueValue().should('contain', 'test-cluster-queue');
    });

    it('should display quota source', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQuotaSourceValue().should('contain', '-');
    });

    it('should display CPU and Memory consumption', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCPUQuotaTotal().should('contain', '100');
      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '40 (40%)');

      trainingJobResourcesTab.findMemoryQuotaTotal().should('contain', '64Gi');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '20Gi (31%)');
    });

    it('should display GPU consumption when available', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('gpu-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // GPU cluster queue has: 200 CPU, 128Gi Memory, 8 GPU
      trainingJobResourcesTab.findCPUQuotaTotal().should('contain', '200');
      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '50 (25%)');

      trainingJobResourcesTab.findMemoryQuotaTotal().should('contain', '128Gi');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '32Gi (25%)');

      trainingJobResourcesTab.findGPUQuotaTotal().should('contain', '8');
      trainingJobResourcesTab.findGPUQuotaConsumed().should('contain', '2 (25%)');
    });

    it('should display cohort when set', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('gpu-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQuotaSourceValue().should('contain', 'ml-training-cohort');
    });

    it('should display over-consumption correctly', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('overconsumed-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '180 (180%)');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '100Gi (156%)');
    });

    it('should show dash when no consumed resources available', () => {
      initIntercepts();

      cy.interceptK8s(
        { model: ClusterQueueModel, name: 'test-cluster-queue' },
        {
          ...mockClusterQueueK8sResource({ name: 'test-cluster-queue' }),
          status: {
            flavorsUsage: [],
          },
        },
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findConsumedQuotaValue().should('contain', '-');
    });

    it('should update resources tab when switching between jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const firstRow = trainingJobTable.getTableRow('image-classification-job');
      firstRow.findNameLink().click();
      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');
      trainingJobResourcesTab.findNodesValue().should('contain', '4');

      const secondRow = trainingJobTable.getTableRow('nlp-model-training');
      secondRow.findNameLink().click();
      trainingJobResourcesTab.findNodesValue().should('contain', '3');

      const thirdRow = trainingJobTable.getTableRow('a-first-job');
      thirdRow.findNameLink().click();
      trainingJobResourcesTab.findNodesValue().should('contain', '6');
    });
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

  describe('Node Scaling', () => {
    beforeEach(() => {
      initIntercepts();

      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );

        if (matchingWorkload && job.metadata.uid) {
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
    });

    it('should not show scale nodes option in kebab menu for running job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');
    });

    it('should open scale nodes modal from inline edit button in Resources tab for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is enabled for paused job
      trainingJobResourcesTab.findNodesEditButton().should('not.be.disabled');
      trainingJobResourcesTab.findNodesEditButton().click();

      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');
    });

    it('should disable scaling for running, completed and failed jobs', () => {
      modelTrainingGlobal.visit(projectName);

      // Test running job
      const runningRow = trainingJobTable.getTableRow('image-classification-job');
      runningRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for running job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for running job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');

      trainingJobDetailsDrawer.close();

      // Test completed job
      const completedRow = trainingJobTable.getTableRow('nlp-model-training');
      completedRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for completed job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for completed job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');

      trainingJobDetailsDrawer.close();

      // Test failed job
      const failedRow = trainingJobTable.getTableRow('failed-training-job');
      failedRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for failed job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for failed job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');
    });

    it('should successfully scale nodes up and down for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      // Test scaling up from 2 to 4
      const pausedJobScaledUp = mockTrainJobK8sResourceList([
        {
          name: 'paused-training-job',
          namespace: projectName,
          status: TrainingJobState.PAUSED,
          numNodes: 4,
          localQueueName: 'paused-queue',
          suspend: true,
        },
      ])[0];

      cy.interceptK8s(
        'PATCH',
        {
          model: TrainJobModel,
          ns: projectName,
          name: 'paused-training-job',
        },
        pausedJobScaledUp,
      ).as('scaleNodesUp');

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();

      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');

      // Scale up: change node count from 2 to 4
      scaleNodesModal.findNodeCountInput().type('{selectall}4');
      scaleNodesModal.findSaveButton().should('not.be.disabled');

      scaleNodesModal.save();

      // Verify the PATCH request for scaling up
      cy.wait('@scaleNodesUp').then((interception) => {
        expect(interception.request.body).to.deep.equal([
          {
            op: 'replace',
            path: '/spec/trainer/numNodes',
            value: 4,
          },
        ]);
      });

      scaleNodesModal.shouldBeOpen(false);

      // Test scaling down from 2 to 1
      const pausedJobScaledDown = mockTrainJobK8sResourceList([
        {
          name: 'paused-training-job',
          namespace: projectName,
          status: TrainingJobState.PAUSED,
          numNodes: 1,
          localQueueName: 'paused-queue',
          suspend: true,
        },
      ])[0];

      cy.interceptK8s(
        'PATCH',
        {
          model: TrainJobModel,
          ns: projectName,
          name: 'paused-training-job',
        },
        pausedJobScaledDown,
      ).as('scaleNodesDown');

      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();

      scaleNodesModal.shouldBeOpen();

      // Scale down: change node count from 2 to 1
      scaleNodesModal.findNodeCountInput().type('{selectall}1');
      scaleNodesModal.findSaveButton().should('not.be.disabled');
      scaleNodesModal.save();

      // Verify the PATCH request for scaling down
      cy.wait('@scaleNodesDown').then((interception) => {
        expect(interception.request.body).to.deep.equal([
          {
            op: 'replace',
            path: '/spec/trainer/numNodes',
            value: 1,
          },
        ]);
      });

      scaleNodesModal.shouldBeOpen(false);
    });

    it('should reset modal state when reopened for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();

      // Open modal first time
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();
      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.setNodeCount(8);
      scaleNodesModal.cancel();
      scaleNodesModal.shouldBeOpen(false);

      // Open modal second time - should show original value
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();
      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');
    });
  });
});
