import * as React from 'react';
import { AxiosError } from 'axios';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { createRoleBinding, getRoleBinding } from '#~/services/roleBindingService';
import {
  AssociatedSteps,
  EnvVarReducedTypeKeyValues,
  EventStatus,
  Notebook,
  NotebookControllerUserState,
  NotebookProgressStep,
  NotebookStatus,
  OptionalSteps,
  ProgressionStep,
  ProgressionStepTitles,
  ResourceCreator,
  ResourceGetter,
  VariableRow,
} from '#~/types';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { useUser } from '#~/redux/selectors';
import { EMPTY_USER_STATE } from '#~/pages/notebookController/const';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { useAppContext } from '#~/app/AppContext';
import { getRoute } from '#~/services/routeService';
import { EventKind, NotebookKind, RoleBindingKind } from '#~/k8sTypes';
import { useWatchNotebookEvents } from '#~/api';
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
  fetchFunc(namespace, name).catch(async (e: AxiosError) => {
    if (e.response?.status === 404) {
      if (createFunc && createBody) {
        return createFunc(createBody);
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
  if (!notebook?.metadata.annotations || !notebook.metadata.labels) {
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
): Promise<RoleBindingKind | undefined> => {
  const roleBindingName = `${notebookNamespace}-image-pullers`;
  const roleBindingObject: RoleBindingKind = {
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
  return verifyResource<RoleBindingKind>(
    roleBindingName,
    dashboardNamespace,
    getRoleBinding,
    createRoleBinding,
    roleBindingObject,
  );
};

export const useNotebookRedirectLink = (): (() => Promise<string>) => {
  const { currentUserNotebook, currentUserNotebookLink } =
    React.useContext(NotebookControllerContext);
  const { notebookNamespace } = useNamespaces();
  const fetchCountRef = React.useRef(5); // how many tries to get the Route

  const routeName = currentUserNotebook?.metadata.name;

  return React.useCallback((): Promise<string> => {
    if (!routeName) {
      // At time of call, if we do not have a route name, we are too late
      // This should *never* happen, somehow the modal got here before the Notebook had a name!?
      /* eslint-disable-next-line no-console */
      console.error('Unable to determine why there was no route -- notebook did not have a name');
      return Promise.reject();
    }

    return new Promise<string>((presolve, preject) => {
      const call = (resolve: typeof presolve, reject: typeof preject) => {
        if (currentUserNotebookLink) {
          resolve(currentUserNotebookLink);
        } else {
          getRoute(notebookNamespace, routeName)
            .then((route) => {
              resolve(`https://${route.spec.host}/notebook/${notebookNamespace}/${routeName}`);
            })
            .catch((e) => {
              /* eslint-disable-next-line no-console */
              console.warn('Unable to get the route. Re-polling.', e);
              if (fetchCountRef.current <= 0) {
                fetchCountRef.current--;
                setTimeout(() => call(resolve, reject), 1000);
              } else {
                reject();
              }
            });
        }
      };

      call(presolve, () => {
        /* eslint-disable-next-line no-console */
        console.error(
          'Could not fetch route over several tries, See previous warnings for a history of why each failed call.',
        );
        preject();
      });
    });
  }, [notebookNamespace, routeName, currentUserNotebookLink]);
};

export const getEventTimestamp = (event: EventKind): string =>
  event.lastTimestamp || event.eventTime;

export const getEventFullMessage = (event: EventKind): string =>
  `${getEventTimestamp(event)} [${event.reason}] [${event.type}] ${event.message}`;

const filterEvents = (
  allEvents: EventKind[],
  lastActivity: Date,
): [filterEvents: EventKind[], thisInstanceEvents: EventKind[], gracePeriod: boolean] => {
  const thisInstanceEvents = allEvents
    .filter((event) => new Date(getEventTimestamp(event)) >= lastActivity)
    .toSorted((a, b) => getEventTimestamp(a).localeCompare(getEventTimestamp(b)));
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

const useLastActivity = (annotationValue?: string): Date | null => {
  const lastOpenActivity = React.useRef<Date | null>(null);

  if (annotationValue && !lastOpenActivity.current) {
    lastOpenActivity.current = new Date(annotationValue);
  }

  return lastOpenActivity.current;
};

export const getNotebookEventStatus = (
  event: EventKind,
  gracePeriod?: boolean,
): NotebookProgressStep => {
  const timestamp = new Date(getEventTimestamp(event)).getTime();

  // For Oauth-related events
  if (event.message.includes('oauth-proxy') || event.message.includes('ose-oauth-proxy')) {
    switch (event.reason) {
      case 'Pulling':
        return {
          step: ProgressionStep.PULLING_OAUTH,
          status: EventStatus.SUCCESS,
          timestamp,
        };
      case 'Pulled':
        return {
          step: ProgressionStep.OAUTH_PULLED,
          status: EventStatus.SUCCESS,
          timestamp,
        };
      case 'Created':
        return {
          step: ProgressionStep.OAUTH_CONTAINER_CREATED,
          status: EventStatus.SUCCESS,
          timestamp,
        };
      case 'Started':
        return {
          step: ProgressionStep.OAUTH_CONTAINER_STARTED,
          status: EventStatus.SUCCESS,
          timestamp,
        };
      case 'Killing':
        return {
          step: ProgressionStep.OAUTH_CONTAINER_STARTED,
          status: EventStatus.WARNING,
          timestamp,
        };
      default:
        if (event.type === 'Warning') {
          return {
            step: ProgressionStep.OAUTH_CONTAINER_CREATED,
            status: EventStatus.WARNING,
            timestamp,
          };
        }
        return {
          step: ProgressionStep.OAUTH_CONTAINER_PROBLEM,
          status: EventStatus.WARNING,
          timestamp,
        };
    }
  }

  // For notebook-related events
  switch (event.reason) {
    case 'SuccessfulCreate':
      return {
        step: ProgressionStep.POD_CREATED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Scheduled':
      return {
        step: ProgressionStep.POD_ASSIGNED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'SuccessfulAttachVolume':
      return {
        step: ProgressionStep.PVC_ATTACHED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'AddedInterface':
      return {
        step: ProgressionStep.INTERFACE_ADDED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Pulling':
      return {
        step: ProgressionStep.PULLING_NOTEBOOK_IMAGE,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Pulled':
      return {
        step: ProgressionStep.NOTEBOOK_IMAGE_PULLED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Created':
      return {
        step: ProgressionStep.NOTEBOOK_CONTAINER_CREATED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Started':
      return {
        step: ProgressionStep.NOTEBOOK_CONTAINER_STARTED,
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'NotTriggerScaleUp':
      return {
        step: ProgressionStep.POD_PROBLEM,
        description: 'Failed to scale-up',
        status: EventStatus.ERROR,
        timestamp,
      };
    case 'TriggeredScaleUp':
      return {
        step: ProgressionStep.POD_PROBLEM,
        description: 'Pod triggered scale-up',
        status: EventStatus.INFO,
        timestamp,
      };
    case 'FailedCreate':
      return {
        step: ProgressionStep.POD_PROBLEM,
        description: 'Failed to create pod',
        status: EventStatus.ERROR,
        timestamp,
      };
    default: {
      if (!gracePeriod && event.reason === 'FailedScheduling') {
        return {
          step: ProgressionStep.POD_PROBLEM,
          description: 'Insufficient resources to start',
          status: EventStatus.ERROR,
          timestamp,
        };
      }
      if (!gracePeriod && event.reason === 'BackOff') {
        return {
          step: ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM,
          description: 'ImagePullBackOff',
          status: EventStatus.ERROR,
          timestamp,
        };
      }
      if (event.type === 'Warning') {
        return {
          step: ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM,
          description: 'Issue creating workbench container',
          status: EventStatus.WARNING,
          timestamp,
        };
      }
      return {
        step: ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM,
        description: '',
        status: EventStatus.WARNING,
        timestamp,
      };
    }
  }
};

export const useNotebookStatus = (
  spawnInProgress: boolean,
  notebook: Notebook | NotebookKind | null,
  isNotebookRunning: boolean,
  currentUserNotebookPodUID: string,
): [status: NotebookStatus | null, events: EventKind[]] => {
  const [events] = useWatchNotebookEvents(
    notebook?.metadata.namespace ?? '',
    notebook?.metadata.name ?? '',
    currentUserNotebookPodUID,
  );

  const lastActivity =
    useLastActivity(notebook?.metadata.annotations?.['notebooks.kubeflow.org/last-activity']) ||
    (notebook && (spawnInProgress || isNotebookRunning)
      ? new Date(notebook.metadata.creationTimestamp ?? 0)
      : null);

  if (!notebook || !lastActivity) {
    // Notebook not started, we don't have a filter time, ignore
    return [null, []];
  }

  const [filteredEvents, thisInstanceEvents, gracePeriod] = filterEvents(events, lastActivity);
  if (filteredEvents.length === 0) {
    return [null, thisInstanceEvents];
  }

  // Parse the last event
  const lastItem = filteredEvents[filteredEvents.length - 1];
  const { step, description, status } = getNotebookEventStatus(lastItem, gracePeriod);

  return [
    {
      currentEvent: description || ProgressionStepTitles[step],
      currentEventReason: lastItem.reason,
      currentEventDescription: lastItem.message,
      currentStatus: status,
    },
    thisInstanceEvents,
  ];
};

const progressionValue = (progressionStep?: ProgressionStep): number => {
  if (!progressionStep) {
    return 0;
  }
  return Object.values(ProgressionStep).indexOf(progressionStep);
};

export const compareProgressSteps = (a: NotebookProgressStep, b: NotebookProgressStep): number => {
  const val = a.timestamp - b.timestamp;
  return val !== 0 ? val : progressionValue(a.step) - progressionValue(b.step);
};

export const useNotebookProgress = (
  notebook: NotebookKind | null,
  isRunning: boolean,
  isStopping: boolean,
  isStopped: boolean,
  events: EventKind[],
): NotebookProgressStep[] => {
  const progressSteps: NotebookProgressStep[] = Object.values(ProgressionStep).map((step) => ({
    step: ProgressionStep[step],
    percentile: 0,
    status: EventStatus.PENDING,
    timestamp: 0,
  }));
  progressSteps[0].status = isStopped || isStopping ? EventStatus.PENDING : EventStatus.SUCCESS;

  let progressEvents = events;
  let gracePeriod = false;

  if (notebook) {
    const annotationTime = notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'];
    const lastActivity = annotationTime
      ? new Date(annotationTime)
      : new Date(notebook.metadata.creationTimestamp ?? 0);

    const [filteredEvents, , period] = filterEvents(events, lastActivity);
    progressEvents = filteredEvents;
    gracePeriod = period;
  }

  const currentProgress = progressEvents
    .map((event) => getNotebookEventStatus(event, gracePeriod))
    .toSorted(compareProgressSteps);

  currentProgress.forEach((currentStep) => {
    const progressStep = progressSteps.find((step) => step.step === currentStep.step);
    if (progressStep) {
      progressStep.status = currentStep.status;
      progressStep.timestamp = currentStep.timestamp;
    }
  });

  // If the container is started and the server is running, mark the server started step complete
  if (
    isRunning &&
    progressSteps.find((p) => p.step === ProgressionStep.OAUTH_CONTAINER_STARTED)?.status ===
      EventStatus.SUCCESS
  ) {
    const startedStep = progressSteps.find((p) => p.step === ProgressionStep.WORKBENCH_STARTED);
    if (startedStep) {
      startedStep.status = EventStatus.SUCCESS;
    }
  }

  // If milestone steps are completed, mark off associated steps
  Object.entries(AssociatedSteps).forEach(([key, values]) => {
    if (progressSteps.find((p) => p.step === key)?.status === EventStatus.SUCCESS) {
      const filteredValues = values.filter((step) => !OptionalSteps.includes(step));
      filteredValues.forEach((value) => {
        const currentStep = progressSteps.find((p) => p.step === value);
        if (currentStep) {
          currentStep.status = EventStatus.SUCCESS;
        }
      });
    }
  });

  // Filter out pending optional steps
  return progressSteps.filter(
    (notebookProgressStep) =>
      !(
        OptionalSteps.includes(notebookProgressStep.step) &&
        progressSteps.find((p) => p.step === notebookProgressStep.step)?.status ===
          EventStatus.PENDING
      ),
  );
};

export const useCheckJupyterEnabled = (): boolean => {
  const { dashboardConfig } = useAppContext();
  return dashboardConfig.spec.notebookController?.enabled !== false;
};
