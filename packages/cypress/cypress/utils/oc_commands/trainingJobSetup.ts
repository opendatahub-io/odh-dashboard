const RETRYABLE_IMAGE_PULL_REASONS = new Set(['ErrImagePull', 'ImagePullBackOff']);
const FATAL_IMAGE_PULL_REASONS = new Set(['InvalidImageName']);

export type TrainJobContainerStatus = {
  image?: string;
  name?: string;
  state?: {
    waiting?: {
      message?: string;
      reason?: string;
    };
  };
};

export type TrainJobPod = {
  metadata?: {
    name?: string;
  };
  status?: {
    containerStatuses?: TrainJobContainerStatus[];
    initContainerStatuses?: TrainJobContainerStatus[];
    phase?: string;
  };
};

export type TrainJobPodList = {
  items?: TrainJobPod[];
};

export type TrainJobPodStartupStatus = {
  fatalError?: string;
  imagePullError?: string;
  started: boolean;
  summary: string;
};

const getContainerStatuses = (pod: TrainJobPod): TrainJobContainerStatus[] => [
  ...(pod.status?.initContainerStatuses ?? []),
  ...(pod.status?.containerStatuses ?? []),
];

const getImagePullError = (podName: string, containerStatus: TrainJobContainerStatus): string => {
  const reason = containerStatus.state?.waiting?.reason ?? 'image pull failure';
  const message = containerStatus.state?.waiting?.message;
  const image = containerStatus.image ?? 'unknown image';
  const container = containerStatus.name ?? 'unknown container';

  return `Training setup failed: container ${container} in worker pod ${podName} cannot pull image ${image} (${reason})${
    message ? `: ${message}` : ''
  }. Verify that the Trainer ClusterTrainingRuntime image is mirrored and allowed by the cluster registry policy.`;
};

export const getTrainJobPodStartupStatus = (podList: TrainJobPodList): TrainJobPodStartupStatus => {
  const pods = podList.items ?? [];
  if (pods.length === 0) {
    return { started: false, summary: 'no worker pods created yet' };
  }

  const summaries = pods.map((pod) => {
    const podName = pod.metadata?.name ?? 'unknown pod';
    const phase = pod.status?.phase ?? 'Unknown';
    const waitingReason = getContainerStatuses(pod).find((status) => status.state?.waiting)?.state
      ?.waiting?.reason;
    return `${podName}: ${phase}${waitingReason ? ` (${waitingReason})` : ''}`;
  });

  for (const pod of pods) {
    const podName = pod.metadata?.name ?? 'unknown pod';
    const containerStatuses = getContainerStatuses(pod);
    const fatalImagePull = containerStatuses.find((status) =>
      FATAL_IMAGE_PULL_REASONS.has(status.state?.waiting?.reason ?? ''),
    );
    if (fatalImagePull) {
      return {
        started: false,
        summary: summaries.join(', '),
        fatalError: getImagePullError(podName, fatalImagePull),
      };
    }

    if (pod.status?.phase === 'Failed') {
      return {
        started: false,
        summary: summaries.join(', '),
        fatalError: `Training setup failed: worker pod ${podName} entered the Failed phase before training started.`,
      };
    }
  }

  for (const pod of pods) {
    const podName = pod.metadata?.name ?? 'unknown pod';
    const retryableImagePull = getContainerStatuses(pod).find((status) =>
      RETRYABLE_IMAGE_PULL_REASONS.has(status.state?.waiting?.reason ?? ''),
    );
    if (retryableImagePull) {
      return {
        started: false,
        summary: summaries.join(', '),
        imagePullError: getImagePullError(podName, retryableImagePull),
      };
    }
  }

  const started = pods.every((pod) => ['Running', 'Succeeded'].includes(pod.status?.phase ?? ''));
  return { started, summary: summaries.join(', ') };
};
