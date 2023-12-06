import { PodKind } from '~/k8sTypes';
import { PodContainer } from '~/types';
import { getPodContainerLogText } from '~/api';
import { downloadString } from '~/utilities/string';

const currentTimeStamp = new Date().toISOString();

export const getPodContainers = (
  pod: PodKind | null,
): { containers: PodContainer[]; initContainers: PodContainer[] } => ({
  containers: pod?.spec.containers ?? [],
  initContainers: pod?.spec.initContainers ?? [],
});

export const downloadCurrentStepLog = async (
  namespace: string,
  podName: string,
  containerName: string,
  podCompleted: boolean | undefined,
) =>
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
) => {
  const logPromises = podContainers
    .filter((podContainer) => podContainer !== null)
    .map(async (podContainer) => {
      const logsIndividualStep = await getPodContainerLogText(
        namespace,
        pod.metadata.name,
        podContainer.name,
      );
      return `=============
${podContainer.name}
=============
${logsIndividualStep}`;
    });
  const completed = (pod.status?.containerStatuses || []).every(
    (containerStatus) => containerStatus?.state?.terminated,
  );
  const allStepLogs = await Promise.all(logPromises);

  const combinedLogs = allStepLogs.join('\n');
  downloadString(`${pod.metadata.name}-${completed ? 'full' : currentTimeStamp}.log`, combinedLogs);
};
