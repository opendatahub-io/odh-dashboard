import { PodKind, PodContainerStatus } from '#~/k8sTypes';
import { PodContainer } from '#~/types';
import { getPodContainerLogText } from '#~/api';
import { downloadString } from '#~/utilities/string';

const currentTimeStamp = new Date().toISOString();

export const getPodContainers = (
  pod: PodKind | null,
): {
  containers: PodContainer[];
  containerStatuses: PodContainerStatus[];
  initContainers: PodContainer[];
} => ({
  containers: pod?.spec.containers ?? [],
  containerStatuses: pod?.status?.containerStatuses ?? [],
  initContainers: pod?.spec.initContainers ?? [],
});

export const downloadCurrentStepLog = async (
  namespace: string,
  podName: string,
  containerName: string,
  podCompleted: boolean | undefined,
): Promise<string | void> =>
  getPodContainerLogText(namespace, podName, containerName).then((content) =>
    downloadString(
      `${podName}-${containerName}-${podCompleted ? 'full' : currentTimeStamp}.log`,
      content,
    ),
  );

export const downloadAllStepLogs = async (
  podContainers: PodContainer[],
  namespace: string,
  pod: PodKind,
): Promise<void> => {
  const logPromises = podContainers.reduce<Promise<string>[]>((accumulator, podContainer) => {
    const logpromise = getPodContainerLogText(namespace, pod.metadata.name, podContainer.name).then(
      (logsIndividualStep) => `=============
${podContainer.name}
=============
${logsIndividualStep}`,
    );

    accumulator.push(logpromise);
    return accumulator;
  }, []);
  const completed = (pod.status?.containerStatuses || []).every(
    (containerStatus) => containerStatus.state?.terminated,
  );
  const allStepLogs = await Promise.all(logPromises);

  const combinedLogs = allStepLogs.join('\n');
  downloadString(`${pod.metadata.name}-${completed ? 'full' : currentTimeStamp}.log`, combinedLogs);
};
