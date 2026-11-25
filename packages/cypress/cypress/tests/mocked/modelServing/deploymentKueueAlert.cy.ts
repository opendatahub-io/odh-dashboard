import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { ClusterQueueModel, WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { modelServingGlobal } from '../../../pages/modelServing';
import {
  InferenceServiceModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SelfSubjectAccessReviewModel,
  ServingRuntimeModel,
} from '../../../utils/models';

const MODEL_NAME = 'Test Kueue Model';
const QUEUE_NAME = 'constrained-queue';
const WORKLOAD_NAME = 'workload-model-pod';

const initIntercepts = (workloadStatus: WorkloadStatusType) => {
  const pod = mockPodK8sResource({
    name: 'model-pod',
    isPending: true,
    isRunning: false,
    labels: { 'serving.kserve.io/inferenceservice': 'test-kueue-model' },
  });
  if (pod.status) {
    pod.status.conditions = [];
  }
  const workload = mockWorkloadK8sResource({
    k8sName: WORKLOAD_NAME,
    ownerName: 'model-pod',
    mockStatus: workloadStatus,
  });
  const ownerRef = workload.metadata?.ownerReferences?.[0];
  if (!ownerRef || !pod.metadata.uid) {
    throw new Error('Mock workload and pod need a matching owner UID');
  }
  ownerRef.kind = 'Pod';
  ownerRef.uid = pod.metadata.uid;

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.KUEUE]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ disableKServe: false, disableKueue: false }),
  );
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKServe: true, enableKueue: true })]),
  );
  cy.interceptK8sList(
    InferenceServiceModel,
    mockK8sResourceList([
      mockInferenceServiceK8sResource({
        name: 'test-kueue-model',
        displayName: MODEL_NAME,
        additionalLabels: { 'kueue.x-k8s.io/queue-name': QUEUE_NAME },
        activeModelState: 'Pending',
        targetModelState: 'Loading',
      }),
    ]),
  );
  cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList([]));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
  cy.intercept('GET', '/api/k8s/api/v1/namespaces/test-project/pods*', (req) => {
    const selector = String(req.query.labelSelector);
    req.reply(mockK8sResourceList(selector.includes('llminferenceservice-workload') ? [] : [pod]));
  });
  cy.interceptK8sList(
    { model: WorkloadModel, ns: 'test-project' },
    mockK8sResourceList([workload]),
  );
  cy.interceptK8s(
    'POST',
    SelfSubjectAccessReviewModel,
    mockSelfSubjectAccessReview({
      group: ClusterQueueModel.apiGroup,
      resource: ClusterQueueModel.plural,
      verb: 'get',
      allowed: true,
    }),
  );
};

describe('Model deployment Kueue alert', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('shows the queue state and position in the progress modal', () => {
    initIntercepts(WorkloadStatusType.Pending);
    cy.intercept(
      'GET',
      `/api/k8s/apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/test-project/localqueues/${QUEUE_NAME}/pendingworkloads`,
      {
        kind: 'PendingWorkloadsSummary',
        apiVersion: 'visibility.kueue.x-k8s.io/v1beta2',
        metadata: {},
        items: [
          {
            metadata: { name: WORKLOAD_NAME, namespace: 'test-project' },
            priority: 0,
            localQueueName: QUEUE_NAME,
            positionInClusterQueue: 1,
            positionInLocalQueue: 1,
          },
        ],
      },
    ).as('pendingWorkloads');

    modelServingGlobal.visit('test-project');
    cy.wait('@pendingWorkloads');
    modelServingGlobal.openDeploymentStatusModal(MODEL_NAME).should('be.visible');
    modelServingGlobal
      .findDeploymentKueueAlert()
      .should('contain.text', `Queued: Waiting for quota in ${QUEUE_NAME}`)
      .and('contain.text', `2nd in ${QUEUE_NAME}`);
    cy.screenshot('model-deployment-kueue-queued');

    modelServingGlobal.findDeploymentStatusResourcesTab().click();
    modelServingGlobal.findDeploymentKueueAlert().should('not.exist');
    cy.screenshot('model-deployment-kueue-resources-tab');
  });

  it('shows the queued message when a queue position is unavailable', () => {
    initIntercepts(WorkloadStatusType.Pending);
    cy.intercept(
      'GET',
      `/api/k8s/apis/visibility.kueue.x-k8s.io/v1beta2/namespaces/test-project/localqueues/${QUEUE_NAME}/pendingworkloads`,
      {
        kind: 'PendingWorkloadsSummary',
        apiVersion: 'visibility.kueue.x-k8s.io/v1beta2',
        metadata: {},
        items: [],
      },
    ).as('pendingWorkloads');

    modelServingGlobal.visit('test-project');
    cy.wait('@pendingWorkloads');
    modelServingGlobal.openDeploymentStatusModal(MODEL_NAME).should('be.visible');
    modelServingGlobal
      .findDeploymentKueueAlert()
      .should('contain.text', `Queued: Waiting for quota in ${QUEUE_NAME}`)
      .invoke('text')
      .should('not.match', /\b\d+(?:st|nd|rd|th) in /);
    cy.screenshot('model-deployment-kueue-queued-no-position');
  });

  it('shows the admitted message in the progress modal', () => {
    initIntercepts(WorkloadStatusType.Admitted);

    modelServingGlobal.visit('test-project');
    modelServingGlobal.openDeploymentStatusModal(MODEL_NAME).should('be.visible');
    modelServingGlobal
      .findDeploymentKueueAlert()
      .should(
        'contain.text',
        'Kueue has admitted this job, looking for available resources to start.',
      );
    cy.screenshot('model-deployment-kueue-admitted');
  });
});
