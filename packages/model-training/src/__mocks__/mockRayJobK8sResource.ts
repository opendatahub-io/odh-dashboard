import * as _ from 'lodash-es';
import { genUID } from '@odh-dashboard/internal/__mocks__/mockUtils';
import { RayJobKind } from '@odh-dashboard/model-training/k8sTypes';
import { RayJobStatusValue, RayJobDeploymentStatus } from '@odh-dashboard/model-training/types';

type MockRayJobConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  entrypoint?: string;
  runtimeEnvYAML?: string;
  suspend?: boolean;
  submissionMode?: RayJobKind['spec']['submissionMode'];
  jobStatus?: string;
  jobDeploymentStatus?: string;
  rayClusterName?: string;
  dashboardURL?: string;
  startTime?: string;
  endTime?: string;
  message?: string;
  reason?: string;
  succeeded?: number;
  failed?: number;
  additionalLabels?: Record<string, string>;
  isDeleting?: boolean;
};

export const mockRayJobK8sResource = ({
  name = 'test-ray-job',
  namespace = 'test-project',
  uid = genUID('ray-job'),
  creationTimestamp = '2024-01-15T10:30:00Z',
  entrypoint = 'python train.py',
  runtimeEnvYAML = 'pip:\n  - torch\n  - transformers',
  suspend = false,
  submissionMode = 'K8sJobMode',
  jobStatus,
  jobDeploymentStatus,
  rayClusterName = `${name}-raycluster`,
  dashboardURL = `http://${name}-head-svc.${namespace}:8265`,
  startTime,
  endTime,
  message,
  reason,
  succeeded = 0,
  failed = 0,
  additionalLabels = {},
  isDeleting = false,
}: MockRayJobConfigType = {}): RayJobKind => {
  const resolvedJobStatus =
    jobStatus ??
    (() => {
      if (jobDeploymentStatus === RayJobDeploymentStatus.COMPLETE) {
        return RayJobStatusValue.SUCCEEDED;
      }
      if (jobDeploymentStatus === RayJobDeploymentStatus.FAILED) {
        return RayJobStatusValue.FAILED;
      }
      if (
        jobDeploymentStatus === RayJobDeploymentStatus.RUNNING ||
        jobDeploymentStatus === undefined
      ) {
        return RayJobStatusValue.RUNNING;
      }
      return undefined;
    })();

  const resolvedDeploymentStatus = jobDeploymentStatus ?? RayJobDeploymentStatus.RUNNING;

  const metadata: RayJobKind['metadata'] = {
    name,
    namespace,
    uid,
    creationTimestamp,
    labels: {
      'app.kubernetes.io/name': 'ray-job',
      ...additionalLabels,
    },
    resourceVersion: '12345',
    generation: 1,
  };

  if (isDeleting) {
    metadata.deletionTimestamp = new Date().toISOString();
  }

  const resolvedStartTime =
    startTime ??
    (resolvedDeploymentStatus !== RayJobDeploymentStatus.INITIALIZING
      ? creationTimestamp
      : undefined);

  const resolvedEndTime =
    endTime ??
    (resolvedDeploymentStatus === RayJobDeploymentStatus.COMPLETE ||
    resolvedDeploymentStatus === RayJobDeploymentStatus.FAILED
      ? new Date(new Date(creationTimestamp).getTime() + 3600000).toISOString()
      : undefined);

  return _.merge(
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata,
      spec: {
        entrypoint,
        runtimeEnvYAML,
        suspend,
        submissionMode,
        shutdownAfterJobFinishes: true,
        ttlSecondsAfterFinished: 300,
        rayClusterSpec: {
          headGroupSpec: { template: {} },
        },
      },
      status: {
        jobStatus: resolvedJobStatus,
        jobDeploymentStatus: resolvedDeploymentStatus,
        rayClusterName,
        dashboardURL,
        startTime: resolvedStartTime,
        endTime: resolvedEndTime,
        message,
        reason,
        succeeded,
        failed,
      },
    },
    {},
  );
};

export const mockRayJobK8sResourceList = (configs: MockRayJobConfigType[] = []): RayJobKind[] =>
  configs.map((config) => mockRayJobK8sResource(config));

export const mockRunningRayJob = (overrides?: Partial<MockRayJobConfigType>): RayJobKind =>
  mockRayJobK8sResource({
    name: 'running-ray-job',
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    ...overrides,
  });

export const mockSucceededRayJob = (overrides?: Partial<MockRayJobConfigType>): RayJobKind =>
  mockRayJobK8sResource({
    name: 'succeeded-ray-job',
    jobStatus: RayJobStatusValue.SUCCEEDED,
    jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
    succeeded: 1,
    ...overrides,
  });

export const mockFailedRayJob = (overrides?: Partial<MockRayJobConfigType>): RayJobKind =>
  mockRayJobK8sResource({
    name: 'failed-ray-job',
    jobStatus: RayJobStatusValue.FAILED,
    jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
    failed: 1,
    reason: 'AppFailed',
    message: 'Ray job failed due to application error.',
    ...overrides,
  });

export const mockSuspendedRayJob = (overrides?: Partial<MockRayJobConfigType>): RayJobKind =>
  mockRayJobK8sResource({
    name: 'suspended-ray-job',
    suspend: true,
    jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
    ...overrides,
  });

export const mockInitializingRayJob = (overrides?: Partial<MockRayJobConfigType>): RayJobKind =>
  mockRayJobK8sResource({
    name: 'initializing-ray-job',
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
    ...overrides,
  });
