import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import type { WorkloadKind, WorkloadPodSet } from '@odh-dashboard/k8s-core';
import {
  HardwareProfileModel,
  LocalQueueModel,
  PodModel,
  WorkloadModel,
} from '@odh-dashboard/k8s-core/api/models';
import {
  InferenceServiceModel,
  NotebookModel,
  TrainJobModel,
} from '@odh-dashboard/internal/api/models';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { LLMInferenceServiceModel } from '@odh-dashboard/internal/api/models/kserve';
import { initIntercepts } from './infrastructureMocks';
import type { InitInterceptsOptions } from './infrastructureMocks';

import { ProjectModel } from '../../../utils/models';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { infrastructurePage } from '../../../pages/infrastructure';

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';
const GPU_QUEUED_JOB_UID = 'gpu-queued-job-uid';
const GPU_INADMISSIBLE_JOB_UID = 'gpu-inadmissible-job-uid';

const projectA = mockProjectK8sResource({ k8sName: PROJECT_A, displayName: 'Project-A' });
const kueueProjectA = mockProjectK8sResource({
  k8sName: PROJECT_A,
  displayName: 'Project-A',
  enableKueue: true,
});
const projectB = mockProjectK8sResource({ k8sName: PROJECT_B, displayName: 'Project-B' });

const initWorkloadsIntercepts = (
  workloads = true,
  enableKueue = false,
  includeKueueWorkbenches = false,
  includeHardwareProfile = false,
  interceptOptions: InitInterceptsOptions = {},
  clusterAdmin = false,
) => {
  if (clusterAdmin) {
    asClusterAdminUser();
  } else {
    asProjectAdminUser();
  }
  initIntercepts(interceptOptions);
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([enableKueue ? kueueProjectA : projectA, projectB]),
  );
  if (enableKueue) {
    cy.interceptK8sList(
      { model: LocalQueueModel, ns: PROJECT_A },
      mockK8sResourceList([
        mockLocalQueueK8sResource({ namespace: PROJECT_A, name: 'user-queue' }),
      ]),
    );
  }
  cy.interceptK8sList(
    { model: NotebookModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads
        ? [
            mockNotebookK8sResource({
              name: 'gpu-workbench',
              displayName: 'GPU Workbench',
              namespace: PROJECT_A,
              ...(includeHardwareProfile && {
                opts: {
                  metadata: {
                    annotations: {
                      'opendatahub.io/hardware-profile-name': 'nvidia-a100',
                      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
                    },
                  },
                },
              }),
            }),
            ...(includeKueueWorkbenches
              ? [
                  mockNotebookK8sResource({
                    name: 'gpu-queued-workbench',
                    displayName: 'GPU Queued Workbench',
                    namespace: PROJECT_A,
                    opts: { metadata: { labels: { 'kueue.x-k8s.io/queue-name': 'user-queue' } } },
                  }),
                  mockNotebookK8sResource({
                    name: 'gpu-inadmissible-workbench',
                    displayName: 'GPU Inadmissible Workbench',
                    namespace: PROJECT_A,
                    opts: { metadata: { labels: { 'kueue.x-k8s.io/queue-name': 'user-queue' } } },
                  }),
                ]
              : []),
          ]
        : [],
    ),
  ).as('infrastructureNotebooksRequest');
  cy.interceptK8sList(
    { model: TrainJobModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads
        ? [
            mockTrainJobK8sResource({
              name: 'gpu-training-job',
              namespace: PROJECT_A,
              status: TrainingJobState.RUNNING,
            }),
            mockTrainJobK8sResource({
              name: 'gpu-queued-job',
              namespace: PROJECT_A,
              uid: GPU_QUEUED_JOB_UID,
              status: TrainingJobState.QUEUED,
              additionalLabels: { 'kueue.x-k8s.io/queue-name': 'user-queue' },
            }),
            mockTrainJobK8sResource({
              name: 'gpu-inadmissible-job',
              namespace: PROJECT_A,
              uid: GPU_INADMISSIBLE_JOB_UID,
              status: TrainingJobState.INADMISSIBLE,
              additionalLabels: { 'kueue.x-k8s.io/queue-name': 'user-queue' },
            }),
          ]
        : [],
    ),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads
        ? [
            mockInferenceServiceK8sResource({
              name: 'gpu-inference-service',
              namespace: PROJECT_A,
              displayName: 'GPU Inference Service',
              isReady: true,
            }),
          ]
        : [],
    ),
  );
  cy.interceptK8sList(
    { model: RayJobModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads
        ? [
            mockRayJobK8sResource({
              name: 'gpu-ray-job',
              namespace: PROJECT_A,
            }),
          ]
        : [],
    ),
  );
  cy.interceptK8sList(
    { model: LLMInferenceServiceModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads
        ? [
            mockLLMInferenceServiceK8sResource({
              name: 'gpu-llm-inference-service',
              namespace: PROJECT_A,
              displayName: 'GPU LLM Inference Service',
            }),
          ]
        : [],
    ),
  );
  cy.interceptK8sList(
    { model: PodModel, ns: PROJECT_A },
    mockK8sResourceList(
      workloads ? [mockPodK8sResource({ name: 'gpu-workbench', namespace: PROJECT_A })] : [],
    ),
  );
};

const initHybridWorkloadsIntercepts = () => {
  initWorkloadsIntercepts(true, true, true);

  const gpuPodSet: WorkloadPodSet = {
    count: 1,
    name: 'main',
    template: {
      metadata: {},
      spec: {
        containers: [
          {
            name: 'main',
            image: 'test-image',
            env: [],
            resources: { requests: { 'nvidia.com/gpu': '1' } },
          },
        ],
      },
    },
  };
  const kueueWorkloads: WorkloadKind[] = [
    (() => {
      const workload = mockWorkloadK8sResource({
        k8sName: 'generated-kueue-workload',
        namespace: PROJECT_A,
        mockStatus: WorkloadStatusType.Pending,
        podSets: [gpuPodSet],
      });
      return workload.metadata
        ? {
            ...workload,
            metadata: {
              ...workload.metadata,
              labels: {
                ...workload.metadata.labels,
                'kueue.x-k8s.io/job-name': 'gpu-queued-job',
                'kueue.x-k8s.io/job-uid': GPU_QUEUED_JOB_UID,
              },
            },
          }
        : workload;
    })(),
    (() => {
      const workload = mockWorkloadK8sResource({
        k8sName: 'gpu-inadmissible-job',
        namespace: PROJECT_A,
        mockStatus: WorkloadStatusType.Inadmissible,
        podSets: [gpuPodSet],
      });
      return workload.metadata
        ? {
            ...workload,
            metadata: {
              ...workload.metadata,
              labels: {
                ...workload.metadata.labels,
                'kueue.x-k8s.io/job-name': 'gpu-inadmissible-job',
                'kueue.x-k8s.io/job-uid': GPU_INADMISSIBLE_JOB_UID,
              },
            },
          }
        : workload;
    })(),
    ...[
      ['gpu-queued-workbench', WorkloadStatusType.Pending],
      ['gpu-inadmissible-workbench', WorkloadStatusType.Inadmissible],
    ].map(([name, status]) => {
      const workload = mockWorkloadK8sResource({
        k8sName: name,
        namespace: PROJECT_A,
        ownerName: name,
        mockStatus: status as WorkloadStatusType,
      });
      if (workload.metadata) {
        workload.metadata.labels = {
          ...workload.metadata.labels,
          'kueue.x-k8s.io/job-name': name,
        };
      }
      return workload;
    }),
  ];

  cy.interceptK8sList(
    { model: LocalQueueModel, ns: PROJECT_A },
    mockK8sResourceList([mockLocalQueueK8sResource({ namespace: PROJECT_A, name: 'user-queue' })]),
  );
  cy.interceptK8sList({ model: WorkloadModel, ns: PROJECT_A }, mockK8sResourceList(kueueWorkloads));

  for (const [jobName, jobUid] of [
    ['gpu-queued-job', GPU_QUEUED_JOB_UID],
    ['gpu-inadmissible-job', GPU_INADMISSIBLE_JOB_UID],
  ] as const) {
    const workload = kueueWorkloads.find(
      (candidate) => candidate.metadata?.labels?.['kueue.x-k8s.io/job-uid'] === jobUid,
    );
    if (!workload) {
      continue;
    }
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: PROJECT_A,
        queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${jobUid}` },
      },
      mockK8sResourceList([workload]),
    );
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: PROJECT_A,
        queryParams: { labelSelector: `kueue.x-k8s.io/job-name=${jobName}` },
      },
      mockK8sResourceList([workload]),
    );
  }
};

const visitAdmissions = (
  interceptOptions: InitInterceptsOptions = {},
  clusterAdmin = false,
): void => {
  initWorkloadsIntercepts(true, true, false, false, interceptOptions, clusterAdmin);
  infrastructurePage.visit(false);
  infrastructurePage.findWorkloadsTab().click();
  infrastructurePage.selectProjectByName('Project-A');
  infrastructurePage.findAdmissionsTab().click();
};

describe('GPUaaS Infrastructure Workloads', () => {
  it('should update the selected project', () => {
    asProjectAdminUser();
    initIntercepts();
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: PROJECT_A, displayName: 'Project-A' }),
        mockProjectK8sResource({ k8sName: PROJECT_B, displayName: 'Project-B' }),
      ]),
    );

    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();

    infrastructurePage.selectProjectByName('Project-B');
    infrastructurePage.findProjectSelectorToggle().should('contain.text', 'Project-B');
  });

  it('should open status modals for workbench, training, and inference workloads', () => {
    initWorkloadsIntercepts();
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    infrastructurePage.findWorkloadsSection().should('be.visible');
    infrastructurePage.findWorkloadWorkbenchStatus('gpu-workbench').click();
    infrastructurePage.findWorkbenchStatusModal().should('be.visible');
    infrastructurePage.findWorkbenchStatusModal().find('[aria-label="Close"]').click();

    infrastructurePage.findWorkloadTrainingStatus('gpu-training-job').click();
    infrastructurePage.findTrainingJobStatusModal().should('be.visible');
    infrastructurePage.findTrainingJobStatusModal().find('[aria-label="Close"]').click();

    infrastructurePage.findWorkloadRayStatus('gpu-ray-job').click();
    infrastructurePage.findRayJobStatusModal().should('be.visible');
    infrastructurePage.findRayJobStatusModal().find('[aria-label="Close"]').click();

    infrastructurePage.findWorkloadInferenceStatus('gpu-inference-service').click();
    infrastructurePage.findDeploymentStatusModal().should('be.visible');
    infrastructurePage.findDeploymentStatusModal().find('[aria-label="Close"]').click();

    infrastructurePage.findWorkloadInferenceStatus('gpu-llm-inference-service').click();
    infrastructurePage.findDeploymentStatusModal().should('be.visible');
    infrastructurePage.findDeploymentStatusModal().find('[aria-label="Close"]').click();
  });

  it('should show the empty state when the selected project has no workloads', () => {
    initWorkloadsIntercepts(false);
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();

    infrastructurePage.findWorkloadsEmptyState().should('exist');
  });

  it('should show an error when no workloads load after a source failure', () => {
    initWorkloadsIntercepts(false);
    cy.interceptK8sList({ model: RayJobModel, ns: PROJECT_A }, { statusCode: 500 }).as(
      'rayJobsRequest',
    );
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();

    cy.wait('@rayJobsRequest');
    infrastructurePage
      .findWorkloadsError()
      .should('be.visible')
      .and('contain.text', 'Unable to load workloads')
      .and('contain.text', 'Workload data could not be loaded. Refresh to try again.');
    infrastructurePage.findWorkloadOverview().should('not.exist');
    infrastructurePage.findWorkloadsTableSection().should('not.exist');
    infrastructurePage.findWorkloadsEmptyState().should('not.exist');
  });

  it('should show successful workloads with a warning when one workload source fails', () => {
    initWorkloadsIntercepts();
    cy.interceptK8sList({ model: RayJobModel, ns: PROJECT_A }, { statusCode: 500 }).as(
      'rayJobsRequest',
    );
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    cy.wait('@rayJobsRequest');
    infrastructurePage
      .findWorkloadsPartialFailure()
      .should('be.visible')
      .and('contain.text', 'Some workload data unavailable')
      .and('contain.text', 'Ray jobs');
    infrastructurePage.findWorkloadsPartialFailureCloseButton().click();
    infrastructurePage.findWorkloadsPartialFailure().should('not.exist');
    infrastructurePage.findWorkloadsRefreshButton().click();
    cy.wait('@rayJobsRequest');
    infrastructurePage.findWorkloadsPartialFailure().should('not.exist');
    infrastructurePage.findWorkloadRow('gpu-training-job').should('exist');
    infrastructurePage.findWorkloadRow('gpu-ray-job').should('not.exist');
    infrastructurePage.findWorkloadsEmptyState().should('not.exist');
  });

  it('should show Hardware Profile loading after the workloads table is available', () => {
    initWorkloadsIntercepts(true, false, false, true);
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'nvidia-a100',
      },
      {
        statusCode: 200,
        body: mockHardwareProfile({ name: 'nvidia-a100', displayName: 'NVIDIA A100' }),
        delay: 5000,
      },
    ).as('hardwareProfileRequest');

    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    cy.wait('@infrastructureNotebooksRequest');
    infrastructurePage.scrollToWorkloadsCard();
    infrastructurePage.findWorkloadRow('gpu-workbench').should('be.visible');
    infrastructurePage
      .findWorkloadRow('gpu-workbench')
      .findByTestId('hardware-profile-loading')
      .should('be.visible');

    cy.wait('@hardwareProfileRequest', { timeout: 40000 });
    infrastructurePage.findWorkloadRow('gpu-workbench').should('contain.text', 'NVIDIA A100');
  });

  it('should filter Kueue and non-Kueue workloads in a hybrid project', () => {
    initHybridWorkloadsIntercepts();
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    infrastructurePage.findWorkloadRow('gpu-training-job').should('exist');
    infrastructurePage.findWorkloadRow('gpu-queued-job').should('exist');
    infrastructurePage.findWorkloadTrainingStatus('gpu-queued-job').click();
    infrastructurePage
      .findTrainingJobStatusModal()
      .should('be.visible')
      .and('contain.text', 'Queued');
    infrastructurePage.findTrainingJobStatusModal().find('[aria-label="Close"]').click();
    infrastructurePage
      .findWorkloadRow('gpu-inadmissible-job')
      .should('exist')
      .and('contain.text', 'Inadmissible');
    infrastructurePage.findWorkloadTrainingStatus('gpu-inadmissible-job').click();
    infrastructurePage.findTrainingJobStatusModal().should('be.visible');
    infrastructurePage
      .findTrainingJobStatusModal()
      .findByTestId('training-job-status')
      .should('contain.text', 'Inadmissible');
    infrastructurePage.findTrainingJobStatusModal().find('[aria-label="Close"]').click();
    infrastructurePage
      .findWorkloadRow('gpu-queued-workbench')
      .should('exist')
      .and('contain.text', 'Queued');
    infrastructurePage.findWorkloadWorkbenchStatus('gpu-queued-workbench').click();
    infrastructurePage
      .findWorkbenchStatusModal()
      .should('be.visible')
      .and('contain.text', 'Queued');
    infrastructurePage.findWorkbenchStatusModal().find('[aria-label="Close"]').click();
    infrastructurePage
      .findWorkloadRow('gpu-inadmissible-workbench')
      .should('exist')
      .and('contain.text', 'Inadmissible');
    infrastructurePage.findWorkloadRow('gpu-ray-job').should('exist');
    infrastructurePage
      .findWorkloadRow('gpu-queued-job')
      .find('[data-label="Priority class"]')
      .should('contain.text', '0');
    infrastructurePage
      .findWorkloadRow('gpu-ray-job')
      .find('[data-label="Priority class"]')
      .should('contain.text', 'Non-Kueue');

    infrastructurePage.selectWorkloadsStatus('Queued');

    infrastructurePage.findWorkloadRow('gpu-queued-job').should('exist');
    infrastructurePage.findWorkloadRow('gpu-queued-workbench').should('exist');
    infrastructurePage.findWorkloadRow('gpu-inadmissible-job').should('not.exist');
    infrastructurePage.findWorkloadRow('gpu-inadmissible-workbench').should('not.exist');
    infrastructurePage.findWorkloadRow('gpu-ray-job').should('not.exist');

    infrastructurePage.selectWorkloadsStatus('Queued');
    infrastructurePage.selectWorkloadsStatus('Inadmissible');

    infrastructurePage.findWorkloadRow('gpu-inadmissible-job').should('exist');
    infrastructurePage.findWorkloadRow('gpu-inadmissible-workbench').should('exist');
    infrastructurePage.findWorkloadRow('gpu-queued-job').should('not.exist');
    infrastructurePage.findWorkloadRow('gpu-queued-workbench').should('not.exist');
    infrastructurePage.findWorkloadRow('gpu-ray-job').should('not.exist');
  });

  it('should use time labels when admissions data is on one calendar day', () => {
    visitAdmissions({ admissionDataSpan: 'same-day' });
    infrastructurePage.selectAdmissionTimeWindow('7d');
    infrastructurePage.findAdmissionMetricCharts().should('be.visible');

    infrastructurePage
      .findAdmissionMetricCharts()
      .find('.gpuaas-workload-overview__admission-metric')
      .should('have.length', 2)
      .each(($metric) => {
        cy.wrap($metric)
          .find('svg text')
          .then(($labels) => {
            const labels = [...$labels].map((label) => label.textContent.trim()).filter(Boolean);
            expect(labels.some((label) => label.includes(':'))).to.equal(true);
            expect(new Set(labels).size).to.equal(labels.length);
          });
      });
    infrastructurePage.findAdmissionMetricCharts().find('svg [stroke-dasharray]').should('exist');
  });

  it('should show all admission charts for cluster admins', () => {
    visitAdmissions({ admissionDataSpan: 'same-day' }, true);
    infrastructurePage.findAdmissionMetricCharts().should('be.visible');
    infrastructurePage
      .findAdmissionMetricCharts()
      .find('.gpuaas-workload-overview__admission-metric')
      .should('have.length', 4);
  });

  it('should use date labels when admissions data spans calendar days', () => {
    visitAdmissions({ admissionDataSpan: 'multi-day' });
    infrastructurePage.selectAdmissionTimeWindow('7d');
    infrastructurePage.findAdmissionMetricCharts().should('be.visible');

    infrastructurePage
      .findAdmissionMetricCharts()
      .find('.gpuaas-workload-overview__admission-metric')
      .should('have.length', 2)
      .each(($metric) => {
        cy.wrap($metric)
          .find('svg text')
          .then(($labels) => {
            const labels = [...$labels]
              .map((label) => label.textContent.trim().replace(/\s+/g, ' '))
              .filter(Boolean);
            expect(
              labels.some((label) => /(?:[A-Za-z]{3} \d{1,2}|\d{1,2} [A-Za-z]{3})/.test(label)),
            ).to.equal(true);
            expect(labels.some((label) => label.includes(':'))).to.equal(false);
            expect(new Set(labels).size).to.equal(labels.length);
          });
      });
  });

  it('should render completed all-NaN admission lead-time data without a skeleton', () => {
    visitAdmissions({ admissionDataSpan: 'same-day', admissionLeadTimeNaN: true }, true);
    infrastructurePage.findAdmissionMetricCharts().should('be.visible');
    infrastructurePage.findAdmissionMetricValue('admission-lead-time').should('contain.text', '--');
    infrastructurePage.findAdmissionMetricChartLoading('admission-lead-time').should('not.exist');
    infrastructurePage.findAdmissionMetricValueLoading('admission-lead-time').should('not.exist');
  });

  it('should show an error when admission metrics fail to load', () => {
    visitAdmissions({ admissionDataSpan: 'same-day', admissionRequestError: true });

    infrastructurePage
      .findAdmissionMetricsError()
      .should('be.visible')
      .and('contain.text', 'Unable to load admission metrics')
      .and('contain.text', 'Some metrics could not be loaded. Refresh to try again.');
  });

  it('should hide Admissions when Kueue is disabled', () => {
    initWorkloadsIntercepts(true, false, false, false, { isKueueInstalled: false });
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    infrastructurePage.findAdmissionsTab().should('not.exist');
  });

  it('should hide Admissions for a project that is not Kueue-managed', () => {
    initWorkloadsIntercepts(true, false);
    infrastructurePage.visit(false);
    infrastructurePage.findWorkloadsTab().click();
    infrastructurePage.selectProjectByName('Project-A');

    infrastructurePage.findAdmissionsTab().should('not.exist');
  });
});
