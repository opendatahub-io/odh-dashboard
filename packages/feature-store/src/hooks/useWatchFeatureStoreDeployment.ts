import React from 'react';
import { FeatureStoreKind, PodKind, K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { NotReadyError } from '@odh-dashboard/internal/utilities/useFetchState';
import { FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import {
  getFeatureStore,
  getPodsForFeatureStore,
} from '@odh-dashboard/internal/api/k8s/featureStores';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';

const LOG_TAIL_LINES = 200;

export type DeploymentPhase = 'Pending' | 'Installing' | 'Ready' | 'Failed' | 'Unknown';

type DeploymentData = {
  featureStore: FeatureStoreKind | null;
  pods: PodKind[];
};

export type DeploymentStatus = {
  featureStore: FeatureStoreKind | null;
  phase: DeploymentPhase;
  conditions: K8sCondition[];
  pods: PodKind[];
  podLogs: FetchStateObject<Record<string, string>>;
  isComplete: boolean;
  isFailed: boolean;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<DeploymentData | undefined>;
};

const resolvePhase = (fs: FeatureStoreKind | null): DeploymentPhase => {
  if (!fs?.status?.phase) {
    return 'Pending';
  }
  const p = fs.status.phase;
  if (p === 'Ready') {
    return 'Ready';
  }
  if (p === 'Failed') {
    return 'Failed';
  }
  if (p === 'Installing' || p === 'Provisioning') {
    return 'Installing';
  }
  return 'Unknown';
};

const useWatchFeatureStoreDeployment = (namespace: string, name: string): DeploymentStatus => {
  const fetchDeployment = React.useCallback(() => {
    if (!namespace || !name) {
      return Promise.reject(new NotReadyError('Missing namespace or name'));
    }
    return Promise.all([
      getFeatureStore(namespace, name),
      getPodsForFeatureStore(namespace, name),
    ]).then(([featureStore, pods]) => ({ featureStore, pods }));
  }, [namespace, name]);

  const { data, loaded, error, refresh } = useFetch<DeploymentData>(
    fetchDeployment,
    { featureStore: null, pods: [] },
    { refreshRate: FAST_POLL_INTERVAL },
  );

  const { featureStore, pods } = data;
  const phase = resolvePhase(featureStore);
  const isComplete = phase === 'Ready';
  const isFailed = phase === 'Failed';

  const fetchLogs = React.useCallback(() => {
    if (!namespace || pods.length === 0) {
      return Promise.reject(new NotReadyError('No pods available'));
    }
    const entries: Promise<[string, string]>[] = [];
    for (const pod of pods) {
      for (const initContainer of pod.spec.initContainers ?? []) {
        const key = `${pod.metadata.name}/init:${initContainer.name}`;
        entries.push(
          getPodContainerLogText(namespace, pod.metadata.name, initContainer.name, LOG_TAIL_LINES)
            .then((text): [string, string] => [key, text])
            .catch((): [string, string] => [key, '(waiting for init container to start...)']),
        );
      }
      for (const container of pod.spec.containers) {
        const key = `${pod.metadata.name}/${container.name}`;
        entries.push(
          getPodContainerLogText(namespace, pod.metadata.name, container.name, LOG_TAIL_LINES)
            .then((text): [string, string] => [key, text])
            .catch((): [string, string] => [key, '(waiting for container to start...)']),
        );
      }
    }
    return Promise.all(entries).then((results) =>
      results.reduce<Record<string, string>>((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {}),
    );
  }, [namespace, pods]);

  const podLogs = useFetch<Record<string, string>>(
    fetchLogs,
    {},
    {
      refreshRate: pods.length > 0 ? FAST_POLL_INTERVAL : 0,
    },
  );

  return {
    featureStore,
    phase,
    conditions: featureStore?.status?.conditions ?? [],
    pods,
    podLogs,
    isComplete,
    isFailed,
    loaded,
    error,
    refresh,
  };
};

export default useWatchFeatureStoreDeployment;
