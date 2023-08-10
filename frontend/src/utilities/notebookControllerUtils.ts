import * as React from 'react';
import { AxiosError } from 'axios';
import { createRoleBinding, getRoleBinding } from '~/services/roleBindingService';
import {
  EnvVarReducedTypeKeyValues,
  EventStatus,
  K8sEvent,
  K8sResourceCommon,
  Notebook,
  NotebookControllerUserState,
  NotebookStatus,
  ResourceCreator,
  ResourceGetter,
  RoleBinding,
  VariableRow,
} from '~/types';
import { NotebookControllerContext } from '~/pages/notebookController/NotebookControllerContext';
import { useUser } from '~/redux/selectors';
import { EMPTY_USER_STATE } from '~/pages/notebookController/const';
import useNamespaces from '~/pages/notebookController/useNamespaces';
import { useAppContext } from '~/app/AppContext';
import { getRoute } from '~/services/routeService';
import { useWatchNotebookEvents } from './useWatchNotebookEvents';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const usernameTranslate = (username: string): string => {
  const encodedUsername = encodeURIComponent(username);
  return encodedUsername
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a')
    .replace(/-/g, '%2d')
    .replace(/\./g, '%2e')
    .replace(/_/g, '%5f')
    .replace(/~/g, '%7f')
    .replace(/%/g, '-')
    .toLowerCase();
};

export const generateNotebookNameFromUsername = (username: string): string =>
  `jupyter-nb-${usernameTranslate(username)}`;

export const generatePvcNameFromUsername = (username: string): string =>
  `jupyterhub-nb-${usernameTranslate(username)}-pvc`;

export const generateEnvVarFileNameFromUsername = (username: string): string =>
  `jupyterhub-singleuser-profile-${usernameTranslate(username)}-envs`;

/**
 * Verify whether a resource is on the cluster
 * If it exists, return the resource object, else, return null
 * If the createFunc is also passed, create it when it doesn't exist
 */
export const verifyResource = async <T extends K8sResourceCommon>(
  name: string,
  namespace: string,
  fetchFunc: ResourceGetter<T>,
  createFunc?: ResourceCreator<T>,
  createBody?: T,
): Promise<T | undefined> =>
  await fetchFunc(namespace, name).catch(async (e: AxiosError) => {
    if (e.response?.status === 404) {
      if (createFunc && createBody) {
        return await createFunc(createBody);
      }
      return undefined;
    }
    throw e;
  });

/** Classify environment variables as ConfigMap or Secret */
export const classifyEnvVars = (variableRows: VariableRow[]): EnvVarReducedTypeKeyValues =>
  variableRows.reduce(
    (prev, curr) => {
      const vars: Record<string, string | number> = {};
      const secretVars: Record<string, string | number> = {};
      curr.variables.forEach((variable) => {
        if (variable.type === 'text') {
          vars[variable.name] = variable.value;
        } else {
          secretVars[variable.name] = variable.value;
        }
      });
      return {
        configMap: { ...prev.configMap, ...vars },
        secrets: { ...prev.secrets, ...secretVars },
      };
    },
    { configMap: {}, secrets: {} },
  );

export const getNotebookControllerUserState = (
  notebook: Notebook | null,
  loggedInUser: string,
): NotebookControllerUserState | null => {
  if (!notebook?.metadata?.annotations || !notebook?.metadata?.labels) {
    return null;
  }

  const {
    'notebooks.kubeflow.org/last-activity': lastActivity,
    'notebooks.opendatahub.io/last-image-selection': lastSelectedImage = '',
    'notebooks.opendatahub.io/last-size-selection': lastSelectedSize = '',
    'opendatahub.io/username': annotationUser = '',
  } = notebook.metadata.annotations;

  let user = annotationUser;
  if (!annotationUser) {
    // Need to always have user -- if we don't, check if the current user is viable to translate to it
    const notebookLabelUser = notebook.metadata.labels['opendatahub.io/user'];
    if (usernameTranslate(loggedInUser) === notebookLabelUser) {
      user = loggedInUser;
    } else {
      /* eslint-disable-next-line no-console */
      console.error('Could not get full user data');
      return null;
    }
  }

  return {
    lastActivity: lastActivity ? new Date(lastActivity).getTime() : undefined,
    lastSelectedImage,
    lastSelectedSize,
    user,
  };
};

export const useSpecificNotebookUserState = (
  notebook: Notebook | null,
): NotebookControllerUserState => {
  const { impersonatedUsername } = React.useContext(NotebookControllerContext);
  const { username: stateUsername } = useUser();
  const username = impersonatedUsername || stateUsername;

  const userState = getNotebookControllerUserState(notebook, username);

  const state = userState ?? {
    ...EMPTY_USER_STATE,
    user: username,
  };

  return useDeepCompareMemoize(state);
};

export const useNotebookUserState = (): NotebookControllerUserState => {
  const { currentUserNotebook } = React.useContext(NotebookControllerContext);
  return useSpecificNotebookUserState(currentUserNotebook);
};

/** Check whether the namespace of the notebooks has the access to image streams
 * If not, create the rolebinding
 */
export const validateNotebookNamespaceRoleBinding = async (
  notebookNamespace: string,
  dashboardNamespace: string,
): Promise<RoleBinding | undefined> => {
  const roleBindingName = `${notebookNamespace}-image-pullers`;
  const roleBindingObject: RoleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: roleBindingName,
      namespace: dashboardNamespace,
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'system:image-puller',
    },
    subjects: [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Group',
        name: `system:serviceaccounts:${notebookNamespace}`,
      },
    ],
  };
  return await verifyResource<RoleBinding>(
    roleBindingName,
    dashboardNamespace,
    getRoleBinding,
    createRoleBinding,
    roleBindingObject,
  );
};

export const useNotebookRedirectLink = (): (() => Promise<string>) => {
  const { currentUserNotebook } = React.useContext(NotebookControllerContext);
  const { notebookNamespace } = useNamespaces();
  const fetchCountRef = React.useRef(5); // how many tries to get the Route

  const routeName = currentUserNotebook?.metadata.name;
  const backupRoute = currentUserNotebook?.metadata.annotations?.['opendatahub.io/link'];

  return React.useCallback((): Promise<string> => {
    if (backupRoute) {
      // TODO: look to remove this in the future to stop relying on backend annotation
      // We already have our backup code's route, use it
      return Promise.resolve(backupRoute);
    }

    if (!routeName) {
      // At time of call, if we do not have a route name, we are too late
      // This should *never* happen, somehow the modal got here before the Notebook had a name!?
      /* eslint-disable-next-line no-console */
      console.error('Unable to determine why there was no route -- notebook did not have a name');
      return Promise.reject();
    }

    return new Promise<string>((presolve, preject) => {
      const call = (resolve: typeof presolve, reject: typeof preject) => {
        getRoute(notebookNamespace, routeName)
          .then((route) => {
            resolve(`https://${route.spec.host}/notebook/${notebookNamespace}/${routeName}`);
          })
          .catch((e) => {
            if (backupRoute) {
              resolve(backupRoute);
              return;
            }
            /* eslint-disable-next-line no-console */
            console.warn('Unable to get the route. Re-polling.', e);
            if (fetchCountRef.current <= 0) {
              fetchCountRef.current--;
              setTimeout(() => call(resolve, reject), 1000);
            } else {
              reject();
            }
          });
      };

      call(presolve, () => {
        /* eslint-disable-next-line no-console */
        console.error(
          'Could not fetch route over several tries, See previous warnings for a history of why each failed call.',
        );
        preject();
      });
    });
  }, [backupRoute, notebookNamespace, routeName]);
};

export const getEventTimestamp = (event: K8sEvent): string =>
  event.lastTimestamp || event.eventTime;

const filterEvents = (
  allEvents: K8sEvent[],
  lastActivity: Date,
): [filterEvents: K8sEvent[], thisInstanceEvents: K8sEvent[], gracePeroid: boolean] => {
  const thisInstanceEvents = allEvents.filter(
    (event) => new Date(getEventTimestamp(event)) >= lastActivity,
  );
  if (thisInstanceEvents.length === 0) {
    // Filtered out all of the events, exit early
    return [[], [], false];
  }

  let filteredEvents = thisInstanceEvents;

  const now = Date.now();
  let gracePeriod = false;

  // Ignore the rest of the filter logic if we pass 20 minutes
  const maxCap = new Date(lastActivity).setMinutes(lastActivity.getMinutes() + 20);
  if (now <= maxCap) {
    // Haven't hit the cap yet, filter events for accepted scenarios
    const infoEvents = filteredEvents.filter((event) => event.type === 'Normal');
    const idleTime = new Date(lastActivity).setSeconds(lastActivity.getSeconds() + 30);
    gracePeriod = idleTime - now > 0;

    // Suppress the warnings when we are idling
    if (gracePeriod) {
      filteredEvents = infoEvents;
    }

    // If we are scaling up, we want to focus on that
    const hasScaleUp = infoEvents.some((event) => event.reason === 'TriggeredScaleUp');
    if (hasScaleUp) {
      // Scaling up event is present -- look for issues with it
      const hasScaleUpIssueIndex = thisInstanceEvents.findIndex(
        (event) => event.reason === 'NotTriggerScaleUp',
      );
      if (hasScaleUpIssueIndex >= 0) {
        // Has scale up issue, show that
        filteredEvents = [thisInstanceEvents[hasScaleUpIssueIndex]];
      } else {
        // Haven't hit a failure in scale up, show just infos
        filteredEvents = infoEvents;
      }
    }
  }

  return [filteredEvents, thisInstanceEvents, gracePeriod];
};

const useLastActivity = (storeValue: boolean, annotationValue?: string): Date | null => {
  const lastOpenActivity = React.useRef<Date | null>(null);

  if (storeValue && annotationValue && !lastOpenActivity.current) {
    lastOpenActivity.current = new Date(annotationValue);
  } else if (!storeValue && lastOpenActivity.current) {
    lastOpenActivity.current = null;
  }

  return lastOpenActivity.current;
};

export const useNotebookStatus = (
  spawnInProgress: boolean,
  open: boolean,
): [status: NotebookStatus | null, events: K8sEvent[]] => {
  const { notebookNamespace } = useNamespaces();
  const {
    currentUserNotebook: notebook,
    currentUserNotebookIsRunning: isNotebookRunning,
    currentUserNotebookPodUID,
  } = React.useContext(NotebookControllerContext);

  const events = useWatchNotebookEvents(
    notebookNamespace,
    currentUserNotebookPodUID,
    spawnInProgress && !isNotebookRunning,
  ).filter(
    (evt) =>
      // Note: This looks redundant but is useful -- our state is stale when a new pod starts; this cleans that up
      // This is not ideal, but the alternative is expose a reset function & thread it up to the stop call
      // This is old code and needs to be removed in time, this will do for now.
      evt.involvedObject.uid === currentUserNotebookPodUID,
  );

  const lastActivity = useLastActivity(
    open,
    notebook?.metadata.annotations?.['notebooks.kubeflow.org/last-activity'],
  );
  if (!lastActivity) {
    // Notebook not started, we don't have a filter time, ignore
    return [null, []];
  }

  const [filteredEvents, thisInstanceEvents, gracePeriod] = filterEvents(events, lastActivity);
  if (filteredEvents.length === 0) {
    return [null, thisInstanceEvents];
  }

  // Parse the last event
  let percentile = 0;
  let status: EventStatus = EventStatus.IN_PROGRESS;
  const lastItem = filteredEvents[filteredEvents.length - 1];
  let currentEvent = '';
  if (lastItem.message.includes('oauth-proxy')) {
    switch (lastItem.reason) {
      case 'Pulling': {
        currentEvent = 'Pulling oauth proxy';
        percentile = 72;
        break;
      }
      case 'Pulled': {
        currentEvent = 'Oauth proxy pulled';
        percentile = 80;
        break;
      }
      case 'Created': {
        currentEvent = 'Oauth proxy container created';
        percentile = 88;
        break;
      }
      case 'Started': {
        currentEvent = 'Oauth proxy container started';
        percentile = 96;
        break;
      }
      case 'Killing': {
        currentEvent = 'Stopping container oauth-proxy';
        status = EventStatus.WARNING;
        break;
      }
      default: {
        if (lastItem.type === 'Warning') {
          currentEvent = 'Issue creating oauth proxy container';
          status = EventStatus.WARNING;
        }
      }
    }
  } else {
    switch (lastItem.reason) {
      case 'SuccessfulCreate': {
        currentEvent = 'Pod created';
        percentile = 8;
        break;
      }
      case 'Scheduled': {
        currentEvent = 'Pod assigned';
        percentile = 16;
        break;
      }
      case 'SuccessfulAttachVolume': {
        currentEvent = 'PVC attached';
        percentile = 24;
        break;
      }
      case 'AddedInterface': {
        currentEvent = 'Interface added';
        percentile = 32;
        break;
      }
      case 'Pulling': {
        currentEvent = 'Pulling notebook image';
        percentile = 40;
        break;
      }
      case 'Pulled': {
        currentEvent = 'Notebook image pulled';
        percentile = 48;
        break;
      }
      case 'Created': {
        currentEvent = 'Notebook container created';
        percentile = 56;
        break;
      }
      case 'Started': {
        currentEvent = 'Notebook container started';
        percentile = 64;
        break;
      }
      case 'NotTriggerScaleUp':
        currentEvent = 'Failed to scale-up';
        status = EventStatus.ERROR;
        break;
      case 'TriggeredScaleUp': {
        currentEvent = 'Pod triggered scale-up';
        status = EventStatus.INFO;
        break;
      }
      default: {
        if (!gracePeriod && lastItem.reason === 'FailedScheduling') {
          currentEvent = 'Insufficient resources to start';
          status = EventStatus.ERROR;
        } else if (lastItem.type === 'Warning') {
          currentEvent = 'Issue creating notebook container';
          status = EventStatus.WARNING;
        }
      }
    }
  }

  return [
    {
      percentile,
      currentEvent,
      currentEventReason: lastItem.reason,
      currentEventDescription: lastItem.message,
      currentStatus: status,
    },
    thisInstanceEvents,
  ];
};

export const useCheckJupyterEnabled = (): boolean => {
  const { dashboardConfig } = useAppContext();
  return dashboardConfig.spec.notebookController?.enabled !== false;
};
