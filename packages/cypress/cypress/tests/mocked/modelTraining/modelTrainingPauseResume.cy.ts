/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  ClusterQueueModel,
  LocalQueueModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobStatusModal,
  pauseTrainingJobModal,
} from '../../../pages/modelTraining';
import { ProjectModel } from '../../../utils/models';

const projectName = 'test-pause-resume-project';
const projectDisplayName = 'Test Pause Resume Project';

// Create mock jobs with different states for pause/resume testing
const mockTrainJobs = mockTrainJobK8sResourceList([
  {
    name: 'running-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-15T10:30:00Z',
    jobsStatus: [
      {
        name: 'node',
        active: 4,
        ready: 4,
        succeeded: 0,
        failed: 0,
        suspended: 0,
      },
    ],
  },
  {
    name: 'paused-job',
    namespace: projectName,
    status: TrainingJobState.PAUSED,
    numNodes: 2,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-14T08:15:00Z',
    suspend: true,
  },
  {
    name: 'completed-job',
    namespace: projectName,
    status: TrainingJobState.SUCCEEDED,
    numNodes: 3,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-13T14:45:00Z',
  },
  {
    name: 'failed-job',
    namespace: projectName,
    status: TrainingJobState.FAILED,
    numNodes: 2,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-12T09:00:00Z',
  },
]);

const mockLocalQueues = [
  mockLocalQueueK8sResource({
    name: 'default-queue',
    namespace: projectName,
  }),
];

const mockClusterQueues = [
  mockClusterQueueK8sResource({
    name: 'test-cluster-queue',
  }),
];

// Map job status to workload status
const jobStatusMap: Record<string, TrainingJobState> = {
  'running-job': TrainingJobState.RUNNING,
  'paused-job': TrainingJobState.PAUSED,
  'completed-job': TrainingJobState.SUCCEEDED,
  'failed-job': TrainingJobState.FAILED,
};

const mockWorkloads = mockTrainJobs.map((job) => {
  const jobStatus = jobStatusMap[job.metadata.name] ?? TrainingJobState.RUNNING;
  let workloadStatus = WorkloadStatusType.Running;
  let workloadSpec = { active: true };

  if (jobStatus === TrainingJobState.FAILED) {
    workloadStatus = WorkloadStatusType.Failed;
  } else if (jobStatus === TrainingJobState.SUCCEEDED) {
    workloadStatus = WorkloadStatusType.Succeeded;
  } else if (jobStatus === TrainingJobState.PAUSED) {
    workloadStatus = WorkloadStatusType.Running;
    workloadSpec = { active: false };
  }

  const workload = mockWorkloadK8sResource({
    k8sName: `workload-${job.metadata.name}`,
    namespace: job.metadata.namespace,
    mockStatus: workloadStatus,
  });

  if (!workload.metadata) {
    throw new Error('Workload metadata is required');
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
        message: 'Quota reserved in ClusterQueue test-cluster-queue',
        reason: 'QuotaReserved',
        status: 'True',
        type: 'QuotaReserved',
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
    },
  };
});

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      trainingJobs: true,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: projectName,
        displayName: projectDisplayName,
        enableKueue: true,
      }),
    ]),
  );

  cy.interceptK8sList(
    {
      model: TrainJobModel,
      ns: projectName,
    },
    mockK8sResourceList(mockTrainJobs),
  );

  cy.interceptK8sList(
    {
      model: LocalQueueModel,
      ns: projectName,
    },
    mockK8sResourceList(mockLocalQueues),
  );

  mockLocalQueues.forEach((queue) => {
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

  cy.interceptK8s({ model: ClusterQueueModel, name: 'test-cluster-queue' }, mockClusterQueues[0]);

  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: projectName,
    },
    mockK8sResourceList(mockWorkloads),
  );

  // Set up Workload list intercepts with label selectors for each job
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
};

describe('Model Training Pause/Resume', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  describe('Pause/Resume Column in Table', () => {
    it('should display Pause button for running jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findPauseResumeToggle().should('be.visible');
      row.findPauseResumeToggle().should('contain', 'Pause');
    });

    it('should display Resume button for paused jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-job');
      row.findPauseResumeToggle().should('be.visible');
      row.findPauseResumeToggle().should('contain', 'Resume');
    });

    it('should not display pause/resume button for completed jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('completed-job');
      row.findPauseResumeToggle().should('not.exist');
    });

    it('should not display pause/resume button for failed jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('failed-job');
      row.findPauseResumeToggle().should('not.exist');
    });
  });

  describe('Pause Confirmation Modal', () => {
    it('should open pause modal when clicking Pause button', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findPauseResumeToggle().click();

      pauseTrainingJobModal.shouldBeOpen();
    });

    it('should display right information in modal', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findPauseResumeToggle().click();

      pauseTrainingJobModal.shouldBeOpen();
      pauseTrainingJobModal.find().should('contain', 'running-job');

      pauseTrainingJobModal.findDontShowAgainCheckbox().should('exist');
      pauseTrainingJobModal.findDontShowAgainCheckbox().should('not.be.checked');
    });

    it('should close modal when Cancel is clicked', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findPauseResumeToggle().click();

      pauseTrainingJobModal.shouldBeOpen();
      pauseTrainingJobModal.cancel();
      pauseTrainingJobModal.shouldBeOpen(false);
    });

    it('should successfully pause job when confirmed', () => {
      initIntercepts();

      // Mock the PATCH request for pausing (Workload patch)
      const pausedWorkload = {
        ...mockWorkloads[0],
        spec: { ...mockWorkloads[0].spec, active: false },
      };

      cy.interceptK8s('PATCH', WorkloadModel, pausedWorkload).as('pauseWorkload');

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findPauseResumeToggle().click();

      pauseTrainingJobModal.shouldBeOpen();
      pauseTrainingJobModal.pause();

      cy.wait('@pauseWorkload');
      pauseTrainingJobModal.shouldBeOpen(false);
    });
  });

  describe('Resume Action', () => {
    it('should resume paused job immediately without modal', () => {
      initIntercepts();

      // Mock the PATCH request for resuming (Workload patch)
      const resumedWorkload = {
        ...mockWorkloads[1],
        spec: { ...mockWorkloads[1].spec, active: true },
      };

      cy.interceptK8s('PATCH', WorkloadModel, resumedWorkload).as('resumeWorkload');

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-job');
      row.findPauseResumeToggle().click();

      // Resume should happen immediately without modal
      pauseTrainingJobModal.shouldBeOpen(false);
      cy.wait('@resumeWorkload');
    });
  });

  describe('Status Modal Pause/Resume', () => {
    it('should display "Pause job" button for running jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findPauseResumeButton().should('be.visible');
      trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause job');
    });

    it('should display "Resume job" button for paused jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findPauseResumeButton().should('be.visible');
      trainingJobStatusModal.findPauseResumeButton().should('contain', 'Resume job');
    });

    it('should not show pause/resume button for completed jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('completed-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findPauseResumeButton().should('not.exist');
    });

    it('should not show pause/resume button for failed jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('failed-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findPauseResumeButton().should('not.exist');
    });

    it('should close status modal and open pause modal when clicking Pause', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findPauseResumeButton().click();

      trainingJobStatusModal.shouldBeOpen(false);
      pauseTrainingJobModal.shouldBeOpen();
    });
  });

  describe('Drawer Kebab Menu Pause/Resume', () => {
    it('should show "Pause job" option for running jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Pause job').should('exist');
    });

    it('should show "Resume job" option for paused jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Resume job').should('exist');
    });

    it('should not show pause/resume option for completed jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('completed-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Pause job').should('not.exist');
      trainingJobDetailsDrawer.findKebabMenuItem('Resume job').should('not.exist');
    });

    it('should open pause modal from kebab menu', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('running-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Pause job').click();

      pauseTrainingJobModal.shouldBeOpen();
    });
  });
});
