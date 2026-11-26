import * as React from 'react';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sModelCommon, WatchK8sResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { DeploymentWatchSnapshot } from './DeploymentEventsWatch';
import { resolveDeploymentEventSources } from './resolveDeploymentEventSources';
import type { Deployment, ModelServingEventsDiscovery } from '../../../../extension-points';

type EventSourceInputs = {
  deployment: Deployment;
  discovery: ModelServingEventsDiscovery['properties'];
  controllerSnapshots: ReadonlyMap<string, DeploymentWatchSnapshot>;
  enabled: boolean;
};

type EventSources = {
  controllerInputs: { id: string; model: K8sModelCommon; resource: WatchK8sResource }[];
  sourceUids: string[];
  failedKinds: string[];
  discoveryPending: boolean;
};

const useDeploymentEventSources = ({
  deployment,
  discovery,
  controllerSnapshots,
  enabled,
}: EventSourceInputs): EventSources => {
  const { name, namespace, uid } = deployment.model.metadata;
  const { podDiscovery } = deployment;
  const controllerInputs = React.useMemo(
    () =>
      discovery.resources.map(({ scope, apiGroup, ...descriptor }) => {
        const model: K8sModelCommon = { ...descriptor, apiGroup: apiGroup || undefined };
        return {
          id: `${apiGroup}/${model.apiVersion}/${model.plural}`,
          model,
          resource: {
            namespace,
            isList: true,
            groupVersionKind: groupVersionKind(model),
            selector:
              scope === 'model'
                ? {
                    matchLabels: {
                      ...discovery.additionalLabels,
                      [discovery.modelNameLabel]: name,
                    },
                  }
                : undefined,
          },
        };
      }),
    [discovery, name, namespace],
  );

  const sourceUids = React.useMemo(() => {
    if (!enabled || !uid) {
      return [];
    }
    // Combine both inputs before traversal: a leader Pod can own a worker StatefulSet.
    return resolveDeploymentEventSources(uid, [
      ...controllerInputs.flatMap(({ id }) => controllerSnapshots.get(id)?.data ?? []),
      ...(podDiscovery?.pods ?? []),
    ]);
  }, [enabled, uid, controllerInputs, controllerSnapshots, podDiscovery?.pods]);

  const failedKinds = controllerInputs.flatMap(({ id, model }) =>
    controllerSnapshots.get(id)?.error ? [model.kind] : [],
  );
  if (podDiscovery?.error) {
    failedKinds.push('Pod');
  }
  const discoveryPending =
    controllerInputs.some(({ id }) => {
      const snapshot = controllerSnapshots.get(id);
      return !snapshot?.loaded && !snapshot?.error;
    }) || Boolean(podDiscovery && !podDiscovery.loaded && !podDiscovery.error);

  return { controllerInputs, sourceUids, failedKinds, discoveryPending };
};

export default useDeploymentEventSources;
