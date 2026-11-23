import * as React from 'react';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import DeploymentEventsTab, { type DeploymentEventsTabProps } from './DeploymentEventsTab';
import DeploymentEventsWatch, { type DeploymentWatchSnapshot } from './DeploymentEventsWatch';
import { toDeploymentEventRows } from './deploymentEventRows';
import { resolveDeploymentEventSources } from './resolveDeploymentEventSources';
import useDeploymentEventsAccess from './useDeploymentEventsAccess';
import type { Deployment, ModelServingEventsDiscovery } from '../../../../extension-points';

const eventModel: K8sModelCommon = { apiVersion: 'v1', kind: 'Event', plural: 'events' };
const eventGroupVersionKind = groupVersionKind(eventModel);

const useWatchSnapshots = () => {
  const [snapshots, setSnapshots] = React.useState<ReadonlyMap<string, DeploymentWatchSnapshot>>(
    () => new Map(),
  );
  const publish = React.useCallback((id: string, snapshot: DeploymentWatchSnapshot) => {
    setSnapshots((current) => {
      const previous = current.get(id);
      if (
        previous &&
        previous[0] === snapshot[0] &&
        previous[1] === snapshot[1] &&
        previous[2] === snapshot[2]
      ) {
        return current;
      }
      return new Map(current).set(id, snapshot);
    });
  }, []);
  const remove = React.useCallback((id: string) => {
    setSnapshots((current) => {
      if (!current.has(id)) {
        return current;
      }
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  return { snapshots, publish, remove };
};

type ScopeProps = {
  deployment: Deployment;
  discovery: ModelServingEventsDiscovery['properties'];
  visible: boolean;
  panelId: string;
  tabId: string;
};

const DeploymentEventsScope: React.FC<ScopeProps> = ({
  deployment,
  discovery,
  visible,
  panelId,
  tabId,
}) => {
  const { name, namespace, uid } = deployment.model.metadata;
  const identityKnown = Boolean(name && namespace && uid);
  const access = useDeploymentEventsAccess(identityKnown ? namespace : undefined);
  const controllers = useWatchSnapshots();
  const events = useWatchSnapshots();
  const enabled = access === 'allowed' && identityKnown;

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
              scope === 'model' ? { matchLabels: discovery.modelLabelSelector(name) } : undefined,
          },
        };
      }),
    [discovery, name, namespace],
  );

  const { podDiscovery } = deployment;
  const sourceUids = React.useMemo(() => {
    if (!enabled || !uid) {
      return [];
    }
    return resolveDeploymentEventSources(uid, [
      ...controllerInputs.flatMap(({ id }) => controllers.snapshots.get(id)?.[0] ?? []),
      ...(podDiscovery?.pods ?? []),
    ]);
  }, [enabled, uid, controllerInputs, controllers.snapshots, podDiscovery?.pods]);
  const failedKinds = controllerInputs.flatMap(({ id, model }) =>
    controllers.snapshots.get(id)?.[2] ? [model.kind] : [],
  );
  if (podDiscovery?.error) {
    failedKinds.push('Pod');
  }

  const eventSnapshots = sourceUids.map((sourceUid) => events.snapshots.get(sourceUid));
  const failures = eventSnapshots.flatMap((snapshot) => (snapshot?.[2] ? [snapshot[2]] : []));
  const rows = sourceUids.flatMap((sourceUid, index) =>
    toDeploymentEventRows(sourceUid, eventSnapshots[index]?.[0] ?? []),
  );
  const hasReadableEvents = eventSnapshots.some((snapshot) => snapshot?.[1] && !snapshot[2]);
  const hasPartialEventError = failures.length > 0 && (hasReadableEvents || rows.length > 0);
  const isLoading =
    eventSnapshots.some((snapshot) => !snapshot?.[1] && !snapshot?.[2]) ||
    controllerInputs.some(({ id }) => {
      const snapshot = controllers.snapshots.get(id);
      return !snapshot?.[1] && !snapshot?.[2];
    }) ||
    Boolean(podDiscovery && !podDiscovery.loaded && !podDiscovery.error);

  let state: DeploymentEventsTabProps['state'] = 'loading';
  if (access === 'denied') {
    state = 'denied';
  } else if (access === 'error') {
    state = 'review-error';
  } else if (!identityKnown) {
    state = 'fetch-error';
  } else if (
    enabled &&
    !hasPartialEventError &&
    failures.length > 0 &&
    failures.length === sourceUids.length
  ) {
    state = failures.some((error) => getGenericErrorCode(error) === 403) ? 'denied' : 'fetch-error';
  } else if (enabled && !isLoading) {
    state = 'ready';
  }

  return (
    <>
      {enabled &&
        controllerInputs.map(({ id, model, resource }) => (
          <DeploymentEventsWatch
            key={id}
            id={id}
            resource={resource}
            model={model}
            publish={controllers.publish}
            remove={controllers.remove}
          />
        ))}
      {sourceUids.map((sourceUid) => (
        <DeploymentEventsWatch
          key={sourceUid}
          id={sourceUid}
          model={eventModel}
          resource={{
            namespace,
            isList: true,
            groupVersionKind: eventGroupVersionKind,
            fieldSelector: `involvedObject.uid=${sourceUid}`,
          }}
          publish={events.publish}
          remove={events.remove}
        />
      ))}
      <div role="tabpanel" id={panelId} aria-labelledby={tabId} hidden={!visible}>
        <DeploymentEventsTab
          rows={rows}
          state={state}
          failedKinds={enabled ? failedKinds : []}
          hasPartialEventError={hasPartialEventError}
        />
      </div>
    </>
  );
};

export default DeploymentEventsScope;
