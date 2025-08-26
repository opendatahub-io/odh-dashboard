import { useState, useCallback } from 'react';
import {
  downloadAllStepLogs,
  downloadCurrentStepLog,
} from '@odh-dashboard/internal/concepts/k8s/pods/utils';
import { PodContainer } from '@odh-dashboard/internal/types';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';

interface UseTrainingJobDownloadsProps {
  namespace: string;
  podName: string;
  podContainers: PodContainer[];
  selectedContainer: PodContainer | null;
  pod: PodKind | null;
}

const useTrainingJobDownloads = ({
  namespace,
  podName,
  podContainers,
  selectedContainer,
  pod,
}: UseTrainingJobDownloadsProps): {
  downloading: boolean;
  downloadError: Error | undefined;
  onDownload: () => void;
  onDownloadAll: () => void;
} => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<Error | undefined>();

  const onDownload = useCallback(() => {
    if (!podContainers.length || !selectedContainer || !pod) {
      return;
    }
    const podCompleted = (pod.status?.containerStatuses || []).every(
      (containerStatus) => containerStatus.state?.terminated,
    );
    setDownloading(true);
    setDownloadError(undefined);
    downloadCurrentStepLog(namespace, podName, selectedContainer.name, podCompleted)
      .catch(setDownloadError)
      .finally(() => setDownloading(false));
  }, [namespace, podName, selectedContainer, pod, podContainers.length]);

  const onDownloadAll = useCallback(() => {
    if (!podContainers.length || !pod) {
      return;
    }
    setDownloading(true);
    setDownloadError(undefined);
    downloadAllStepLogs(podContainers, namespace, pod)
      .catch(setDownloadError)
      .finally(() => setDownloading(false));
  }, [podContainers, namespace, pod]);

  return {
    downloading,
    downloadError,
    onDownload,
    onDownloadAll,
  };
};

export default useTrainingJobDownloads;
