import { PodKind } from '~/k8sTypes';
import { PodContainer } from '~/types';
import { getPodContainerLogText } from '~/api';
import { downloadString } from '~/utilities/string';

export const getPodContainers = (
  pod: PodKind | null,
): { containers: PodContainer[]; initContainers: PodContainer[] } => ({
  containers: pod?.spec.containers ?? [],
  initContainers: pod?.spec.initContainers ?? [],
});

export const downloadFullPodLog = async (
  namespace: string,
  podName: string,
  containerName: string,
) =>
  getPodContainerLogText(namespace, podName, containerName).then((content) =>
    downloadString(`${podName}-${containerName}.log`, content),
  );

export const downloadAllStepLogs = async (
  podContainers: PodContainer[],
  namespace: string,
  podName: string,
) => {
  const logPromises = podContainers
    .filter((podContainer) => podContainer !== null)
    .map(async (podContainer) => {
      const logsIndividualStep = await getPodContainerLogText(
        namespace,
        podName,
        podContainer.name,
      );
      return `=============
${podContainer.name}
=============
${logsIndividualStep}`;
    });

  const allStepLogs = await Promise.all(logPromises);

  const combinedLogs = allStepLogs.join('\n');
  downloadString(`${podName}.log`, combinedLogs);
};
