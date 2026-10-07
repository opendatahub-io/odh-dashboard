import * as React from 'react';
import type { PodKind } from '@odh-dashboard/k8s-core';
import {
  getClaimLookupNames,
  getDeclaredClaimReferences,
  hasDeclaredClaims,
} from '@odh-dashboard/hardware-profiles/shared/dra/claimResolution';
import type { WorkloadClaimGroup } from '@odh-dashboard/hardware-profiles/shared/dra/types';
import { useResourceClaimLookups } from '@odh-dashboard/hardware-profiles/shared/dra/useResourceClaimLookups';
import {
  resolveWorkloadClaims,
  selectWorkloadPod,
} from '@odh-dashboard/hardware-profiles/shared/dra/workloadClaims';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import { getPodsForNotebook } from '#~/api';
import { NotebookKind } from '#~/k8sTypes';

type UseNotebookClaimsOptions = {
  /** Gate every request on the row being expanded. */
  enabled: boolean;
  /** Pod uid the status already treats as running; used to pick among listed Pods. */
  runningPodUid?: string;
  refreshRate?: number;
};

export type NotebookClaimsState = {
  podsLoaded: boolean;
  podsError?: Error;
  group: WorkloadClaimGroup;
  /** The notebook container; claims it does not reference are still shown, with a note. */
  containerNames: string[];
};

const EMPTY_PODS: PodKind[] = [];

/** Every claim the workbench declares, from its Pod when one exists and from the spec otherwise. */
export const useNotebookClaims = (
  notebook: NotebookKind,
  { enabled, runningPodUid, refreshRate = 0 }: UseNotebookClaimsOptions,
): NotebookClaimsState => {
  const { name, namespace } = notebook.metadata;
  const templateSpec = notebook.spec.template.spec;
  // Nothing is fetched for a workbench that declares no claims.
  const shouldFetch = enabled && hasDeclaredClaims(templateSpec);
  // A collapsed or non-DRA row arms no poll timer.
  const pollRate = shouldFetch ? refreshRate : 0;

  const fetchPods = React.useCallback<FetchStateCallbackPromise<PodKind[]>>(
    (opts) => {
      if (!shouldFetch) {
        return Promise.reject(new NotReadyError('Workbench claims not requested'));
      }
      return getPodsForNotebook(namespace, name, opts);
    },
    [shouldFetch, namespace, name],
  );
  // Purity drops the Pod list on collapse so a re-expand never shows a stale Pod.
  const {
    data: pods,
    loaded: podsLoaded,
    error: podsError,
  } = useFetch(fetchPods, EMPTY_PODS, { refreshRate: pollRate, initialPromisePurity: true });

  const pod = React.useMemo(() => selectWorkloadPod(pods, runningPodUid), [pods, runningPodUid]);
  // The workbench container scopes which requests count as consumed; every declared claim is looked up.
  const containerNames = React.useMemo(() => [name], [name]);
  const { claimNames, templateNames } = React.useMemo(
    () =>
      getClaimLookupNames(
        getDeclaredClaimReferences(pod?.spec ?? templateSpec, pod?.status?.resourceClaimStatuses),
      ),
    [pod, templateSpec],
  );
  // A failed Pod list still allows the spec's declared references to be looked up.
  const lookupsEnabled = shouldFetch && (podsLoaded || !!podsError);
  const lookups = useResourceClaimLookups({
    namespace,
    claimNames,
    templateNames,
    enabled: lookupsEnabled,
    refreshRate: lookupsEnabled ? pollRate : 0,
  });

  const group = React.useMemo(
    () =>
      resolveWorkloadClaims(pod ? { pod } : { spec: templateSpec }, lookups, { containerNames }),
    [pod, templateSpec, lookups, containerNames],
  );

  return { podsLoaded, podsError, group, containerNames };
};
