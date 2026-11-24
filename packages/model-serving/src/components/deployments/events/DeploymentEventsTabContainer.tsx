import * as React from 'react';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import DeploymentEventsTabBody, {
  type DeploymentEventsTabBodyProps,
} from './DeploymentEventsTabBody';
import DeploymentEventsWatch, { type DeploymentWatchSnapshot } from './DeploymentEventsWatch';
import { toDeploymentEventRows, type DeploymentEventRow } from './deploymentEventRows';
import useDeploymentEventsAccess from './useDeploymentEventsAccess';
import useDeploymentEventSources from './useDeploymentEventSources';
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
      // Returning the same map avoids a parent update when the watch values haven't changed.
      if (
        previous &&
        previous.data === snapshot.data &&
        previous.loaded === snapshot.loaded &&
        previous.error === snapshot.error
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

type ContainerProps = {
  deployment: Deployment;
  discovery: ModelServingEventsDiscovery['properties'];
  visible: boolean;
  panelId: string;
  tabId: string;
};

const DeploymentEventsTabContainer: React.FC<ContainerProps> = ({
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
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [pausedRows, setPausedRows] = React.useState<readonly DeploymentEventRow[]>();

  const { controllerInputs, sourceUids, failedKinds, discoveryPending } = useDeploymentEventSources(
    {
      deployment,
      discovery,
      controllerSnapshots: controllers.snapshots,
      enabled,
    },
  );

  // Read only currently reachable sources, even before removed watchers finish cleaning up.
  const eventSnapshots = sourceUids.map((sourceUid) => events.snapshots.get(sourceUid));
  const failures = eventSnapshots.flatMap((snapshot) => (snapshot?.error ? [snapshot.error] : []));
  const liveRows = sourceUids.flatMap((sourceUid) =>
    toDeploymentEventRows(sourceUid, events.snapshots.get(sourceUid)?.data ?? []),
  );
  const hasReadableEvents = eventSnapshots.some((snapshot) => snapshot?.loaded && !snapshot.error);
  // A successful watch can return no rows, and a failed watch can retain earlier rows.
  // In either case, show a warning rather than blocking the tab.
  const hasPartialEventError = failures.length > 0 && (hasReadableEvents || liveRows.length > 0);
  const eventsPending = eventSnapshots.some((snapshot) => !snapshot?.loaded && !snapshot?.error);
  // Pausing unmounts the Event watchers, which remove their live snapshots.
  // Keep the frozen rows until fresh rows arrive or the resumed requests settle.
  const waitingForFreshRows = eventsPending && liveRows.length === 0;
  const showPausedRows = enabled && (!autoRefresh || waitingForFreshRows);
  const rows = showPausedRows ? pausedRows ?? liveRows : liveRows;
  React.useEffect(() => {
    if (autoRefresh && !eventsPending) {
      setPausedRows(undefined);
    }
  }, [autoRefresh, eventsPending]);

  const changeAutoRefresh = (next: boolean) => {
    if (!next) {
      setPausedRows(rows);
    }
    setAutoRefresh(next);
  };
  const isLoading = eventsPending || discoveryPending;

  const allEventSourcesFailed = failures.length > 0 && failures.length === sourceUids.length;
  let state: DeploymentEventsTabBodyProps['state'] = 'loading';
  if (access === 'denied') {
    state = 'denied';
  } else if (access === 'error') {
    state = 'review-error';
  } else if (!identityKnown) {
    state = 'fetch-error';
  } else if (enabled && !autoRefresh) {
    state = 'ready';
  } else if (enabled && allEventSourcesFailed && !hasPartialEventError) {
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
      {/* Keep controller discovery running while paused so Events resume for the current graph. */}
      {autoRefresh &&
        sourceUids.map((sourceUid) => (
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
        <DeploymentEventsTabBody
          rows={rows}
          state={state}
          failedKinds={enabled ? failedKinds : []}
          hasPartialEventError={hasPartialEventError}
          autoRefresh={enabled ? { enabled: autoRefresh, onChange: changeAutoRefresh } : undefined}
        />
      </div>
    </>
  );
};

export default DeploymentEventsTabContainer;
