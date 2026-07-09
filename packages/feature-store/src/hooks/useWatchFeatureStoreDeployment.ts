import React from 'react';
import { K8sCondition, PodKind } from '@odh-dashboard/k8s-core';
import useFetch, { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { FAST_POLL_INTERVAL } from '@odh-dashboard/internal/utilities/const';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import { FeatureStoreKind } from '../k8sTypes';
import { getFeatureStore, getPodsForFeatureStore } from '../api/featureStores';

const LOG_TAIL_LINES = 200;
const MAX_LOG_PODS = 5;
const MAX_LOG_ENTRIES = 15;

export type DeploymentPhase = 'Pending' | 'Installing' | 'Ready' | 'Failed' | 'Unknown';

export const isTerminal = (phase: DeploymentPhase): boolean =>
  phase === 'Ready' || phase === 'Failed';

export const isTransientLogError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes('ContainerCreating') || msg.includes('PodInitializing') || /\b400\b/.test(msg)
  );
};

export const transientLogMessage = (isInit: boolean): string =>
  isInit ? '(waiting for init container to start...)' : '(waiting for container to start...)';

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

export const resolvePhase = (fs: FeatureStoreKind | null): DeploymentPhase => {
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
  if (p === 'Pending') {
    return 'Pending';
  }
  return 'Unknown';
};

const INITIAL_DATA: DeploymentData = { featureStore: null, pods: [] };

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

  const phaseRef = React.useRef<DeploymentPhase>('Pending');

  const { data, loaded, error, refresh } = useFetch<DeploymentData>(fetchDeployment, INITIAL_DATA, {
    refreshRate: isTerminal(phaseRef.current) ? 0 : FAST_POLL_INTERVAL,
  });

  const { featureStore, pods } = data;
  const phase = resolvePhase(featureStore);
  phaseRef.current = phase;
  const isComplete = phase === 'Ready';
  const isFailed = phase === 'Failed';

  const fetchLogs = React.useCallback(() => {
    if (!namespace || pods.length === 0) {
      return Promise.reject(new NotReadyError('No pods available'));
    }
    const entries: Promise<[string, string]>[] = [];
    const recentPods = pods.slice(0, MAX_LOG_PODS);
    for (const pod of recentPods) {
      for (const initContainer of pod.spec.initContainers ?? []) {
        if (entries.length >= MAX_LOG_ENTRIES) {
          break;
        }
        const key = `${pod.metadata.name}/init:${initContainer.name}`;
        entries.push(
          getPodContainerLogText(namespace, pod.metadata.name, initContainer.name, LOG_TAIL_LINES)
            .then((text): [string, string] => [key, text])
            .catch((e): [string, string] => {
              if (isTransientLogError(e)) {
                return [key, transientLogMessage(true)];
              }
              throw e;
            }),
        );
      }
      if (entries.length >= MAX_LOG_ENTRIES) {
        break;
      }
      for (const container of pod.spec.containers) {
        if (entries.length >= MAX_LOG_ENTRIES) {
          break;
        }
        const key = `${pod.metadata.name}/${container.name}`;
        entries.push(
          getPodContainerLogText(namespace, pod.metadata.name, container.name, LOG_TAIL_LINES)
            .then((text): [string, string] => [key, text])
            .catch((e): [string, string] => {
              if (isTransientLogError(e)) {
                return [key, transientLogMessage(false)];
              }
              throw e;
            }),
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

  const logPollRate = isTerminal(phase) ? 0 : FAST_POLL_INTERVAL;
  const podLogs = useFetch<Record<string, string>>(fetchLogs, {}, { refreshRate: logPollRate });

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
