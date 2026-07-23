import * as React from 'react';
import { AxiosError } from 'axios';
import type { PodContainerStatus } from '@odh-dashboard/k8s-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import { createRoleBinding, getRoleBinding } from '#~/services/roleBindingService';
import {
  EnvVarReducedTypeKeyValues,
  EventStatus,
  NotebookControllerUserState,
  NotebookProgressStep,
  NotebookProgressStepKind,
  NotebookStatus,
  ResourceCreator,
  ResourceGetter,
  VariableRow,
} from '#~/types';
import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import { getKueueSubStepInfo, getRequeuedMessage } from '#~/concepts/kueue/messageUtils';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { useUser } from '#~/redux/selectors';
import { EMPTY_USER_STATE } from '#~/pages/notebookController/const';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { useAppContext } from '#~/app/AppContext';
import { EventKind, NotebookKind, RoleBindingKind } from '#~/k8sTypes';
import { useWatchNotebookEvents } from '#~/api';
import { useGetNotebookRoute } from './useGetNotebookRoute';

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

export const getNotebookDisplayName = (notebook: NotebookKind): string =>
  notebook.metadata.annotations?.['openshift.io/display-name'] || notebook.metadata.name || '';

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
  notebook: NotebookKind | null,
  loggedInUser: string,
): NotebookControllerUserState | null => {
  if (!notebook) {
    return null;
  }

  const annotations = notebook.metadata.annotations ?? {};

  const {
    'notebooks.kubeflow.org/last-activity': lastActivity,
    'notebooks.opendatahub.io/last-image-selection': lastSelectedImage = '',
    'notebooks.opendatahub.io/last-size-selection': lastSelectedSize = '',
    'opendatahub.io/username': annotationUser = '',
    'opendatahub.io/user': annotationTranslatedUser = '',
  } = annotations;

  let user = annotationUser;
  if (!annotationUser) {
    // Need to always have user -- if we don't, check if the current user is viable to translate to it
    // Check annotation first, then fall back to label for backward compatibility with older workbenches
    const translatedUser =
      annotationTranslatedUser || notebook.metadata.labels?.['opendatahub.io/user'];
    if (usernameTranslate(loggedInUser) === translatedUser) {
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
  notebook: NotebookKind | null,
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
  const { workbenchNamespace } = useNamespaces();

  const routeName = currentUserNotebook?.metadata.name;

  const workbenchPath =
    useGetNotebookRoute(
      workbenchNamespace,
      routeName,
      currentUserNotebook?.metadata.annotations?.['notebooks.opendatahub.io/inject-auth'] ===
        'true',
      true,
    ) ?? '';

  return React.useCallback((): Promise<string> => {
    if (!routeName) {
      // At time of call, if we do not have a route name, we are too late
      // This should *never* happen, somehow the modal got here before the Notebook had a name!?
      /* eslint-disable-next-line no-console */
      console.error('Unable to determine why there was no route -- notebook did not have a name');
      return Promise.reject();
    }

    return new Promise<string>((resolve) => {
      // Use the existing link if available, otherwise generate the path
      if (currentUserNotebookLink) {
        resolve(currentUserNotebookLink);
      } else {
        // Generate same-origin relative path
        resolve(workbenchPath);
      }
    });
  }, [routeName, currentUserNotebookLink, workbenchPath]);
};

export const getEventTimestamp = (event: EventKind): string =>
  event.lastTimestamp || event.eventTime;

export const getEventFullMessage = (event: EventKind): string =>
  `${getEventTimestamp(event)} [${event.reason}] [${event.type}] ${event.message}`;

const filterEvents = (
  allEvents: EventKind[],
  lastActivity: Date,
): [filterEvents: EventKind[], thisInstanceEvents: EventKind[], gracePeriod: boolean] => {
  const thisInstanceEvents = allEvents.toSorted((a, b) =>
    getEventTimestamp(a).localeCompare(getEventTimestamp(b)),
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

const useLastActivity = (annotationValue?: string): Date | null => {
  const lastOpenActivity = React.useRef<Date | null>(null);

  if (annotationValue && !lastOpenActivity.current) {
    lastOpenActivity.current = new Date(annotationValue);
  }

  return lastOpenActivity.current;
};

// Container names that identify auth-proxy sidecars.
const AUTH_PROXY_NAMES = ['oauth-proxy', 'ose-oauth-proxy', 'kube-rbac-proxy'];

const containerLabel = (name: string, notebookContainerName: string): string => {
  if (name === notebookContainerName) {
    return 'Workbench';
  }
  if (AUTH_PROXY_NAMES.includes(name)) {
    return 'Auth proxy';
  }
  return name;
};

const makeContainerStep = (
  stepKind: NotebookProgressStepKind,
  containerName: string,
  notebookContainerName: string,
  labelFn: (friendly: string) => string,
  status: EventStatus,
  timestamp: number,
  description?: string,
): NotebookProgressStep => ({
  stepKind,
  containerName,
  label: labelFn(containerLabel(containerName, notebookContainerName)),
  status,
  timestamp,
  description,
});

const getKueueStepStatus = (status: KueueWorkloadStatus): EventStatus => {
  switch (status) {
    case KueueWorkloadStatus.Admitted:
    case KueueWorkloadStatus.Running:
    case KueueWorkloadStatus.Complete:
      return EventStatus.SUCCESS;
    case KueueWorkloadStatus.Failed:
      return EventStatus.ERROR;
    case KueueWorkloadStatus.Inadmissible:
    case KueueWorkloadStatus.Evicted:
    case KueueWorkloadStatus.Preempted:
    case KueueWorkloadStatus.Requeued:
      return EventStatus.WARNING;
    case KueueWorkloadStatus.BlockedOnPreemptionGates:
      return EventStatus.IN_PROGRESS;
    case KueueWorkloadStatus.AdmissionCheck:
      return EventStatus.IN_PROGRESS;
    case KueueWorkloadStatus.Queued:
      return EventStatus.PENDING;
    default:
      return EventStatus.IN_PROGRESS;
  }
};

/** True when the notebook was previously running (has a last-activity annotation). */
export const isNotebookRestart = (notebook: NotebookKind | null): boolean =>
  !!notebook?.metadata.annotations?.['notebooks.kubeflow.org/last-activity'];

/**
 * Builds the initial ordered step list from the notebook's pod spec containers.
 * Auth proxy steps only appear when the sidecar is present; Kueue step only when kueueStatus is set.
 */
export const buildInitialProgressSteps = (
  notebook: NotebookKind | null,
  isStopped: boolean,
  isStopping: boolean,
  kueueStatus: KueueWorkloadStatusWithMessage | null,
  isRecovery = false,
): NotebookProgressStep[] => {
  const steps: NotebookProgressStep[] = [];

  const containers = notebook?.spec.template.spec.containers ?? [];
  const notebookContainerName =
    containers.find((c) => !AUTH_PROXY_NAMES.includes(c.name))?.name ?? '';

  steps.push({
    stepKind: 'workbench_requested',
    label: 'Workbench requested',
    status: isStopped || isStopping ? EventStatus.PENDING : EventStatus.SUCCESS,
    timestamp: 0,
  });

  // Pod-level problem placeholder (optional — filtered out if still PENDING at end).
  steps.push({
    stepKind: 'pod_problem',
    label: 'There was a problem with the pod',
    status: EventStatus.PENDING,
    timestamp: 0,
  });

  steps.push({
    stepKind: 'pod_created',
    label: 'Pod created',
    status: EventStatus.PENDING,
    timestamp: 0,
  });

  // Kueue admission nested as a sub-step under pod_assigned when active.
  // Guard on queueName so auto-created workloads for non-Kueue notebooks don't show this sub-step.
  const podAssignedSubSteps: NotebookProgressStep[] = [];
  if (kueueStatus?.queueName) {
    const kueueLabel =
      kueueStatus.status === KueueWorkloadStatus.Requeued
        ? getRequeuedMessage(kueueStatus)
        : getKueueSubStepInfo(
            kueueStatus.status,
            kueueStatus.message,
            kueueStatus.queueName,
            isRecovery,
            kueueStatus.queuePosition ?? undefined,
          ).label;
    podAssignedSubSteps.push({
      stepKind: 'kueue',
      label: kueueLabel,
      status: getKueueStepStatus(kueueStatus.status),
      timestamp: 0,
    });
  }
  steps.push({
    stepKind: 'pod_assigned',
    label: 'Pod assigned',
    status: EventStatus.PENDING,
    timestamp: 0,
    ...(podAssignedSubSteps.length > 0 && {
      subSteps: podAssignedSubSteps,
      isExpanded: true,
    }),
  });

  // PVC attachment (optional — filtered out if still PENDING at end).
  steps.push({
    stepKind: 'pvc_attached',
    label: 'PVC attached',
    status: EventStatus.PENDING,
    timestamp: 0,
  });

  steps.push({
    stepKind: 'interface_added',
    label: 'Interface added',
    status: EventStatus.PENDING,
    timestamp: 0,
  });

  // pulling/pulled/created are sub-steps of the started parent so the tree stays compact.
  containers.forEach((container) => {
    const friendly = containerLabel(container.name, notebookContainerName);
    const subSteps: NotebookProgressStep[] = [
      makeContainerStep(
        'pulling',
        container.name,
        notebookContainerName,
        (f) => (isRecovery ? `Pulling ${f} image (restart)` : `Pulling ${f} image`),
        EventStatus.PENDING,
        0,
      ),
      makeContainerStep(
        'pulled',
        container.name,
        notebookContainerName,
        (f) => `${f} image pulled`,
        EventStatus.PENDING,
        0,
      ),
      makeContainerStep(
        'created',
        container.name,
        notebookContainerName,
        (f) => `${f} container created`,
        EventStatus.PENDING,
        0,
      ),
    ];
    // Per-container problem placeholder (optional — filtered out if still PENDING).
    steps.push({
      stepKind: 'container_problem',
      containerName: container.name,
      label: `There was a problem with the ${friendly.toLowerCase()} container`,
      status: EventStatus.PENDING,
      timestamp: 0,
    });
    steps.push({
      ...makeContainerStep(
        'started',
        container.name,
        notebookContainerName,
        (f) => (isRecovery ? `Restarting ${f} container` : `Starting ${f} container`),
        EventStatus.PENDING,
        0,
      ),
      subSteps,
      isExpanded: false,
    });
  });

  steps.push({
    stepKind: 'workbench_started',
    label: 'Workbench started',
    status: EventStatus.PENDING,
    timestamp: 0,
  });

  return steps;
};

// Secondary sort key when two steps share a timestamp. 'kueue' is absent — it's always a sub-step.
/* eslint-disable @typescript-eslint/naming-convention, camelcase */
const STEP_KIND_ORDER: Record<string, number> = {
  workbench_requested: 0,
  pod_problem: 1,
  pod_created: 2,
  pod_assigned: 3,
  pvc_attached: 4,
  interface_added: 5,
  pulling: 6,
  pulled: 7,
  created: 8,
  container_problem: 9,
  started: 10,
  workbench_started: 11,
};
/* eslint-enable @typescript-eslint/naming-convention, camelcase */

/** Optional step kinds that are filtered from the list when their status is still PENDING. */
const OPTIONAL_STEP_KINDS: Set<NotebookProgressStepKind> = new Set([
  'pod_problem',
  'container_problem',
  'pvc_attached',
]);

const CONTAINER_EVENT_REASONS: Set<string> = new Set([
  'Pulling',
  'Pulled',
  'Created',
  'Started',
  'Killing',
]);

/**
 * Attempts to parse a container name directly from "Created container <name>"
 * or "Started container <name>" event messages.
 */
const parseContainerNameFromMessage = (message: string): string | undefined => {
  const match = /^(?:Created|Started) container (\S+)/.exec(message);
  return match?.[1];
};

/**
 * Maps a single K8s event to a NotebookProgressStep.
 * Returns null for events that cannot be meaningfully mapped.
 */
export const getNotebookEventStatus = (
  event: EventKind,
  containerNames: string[],
  gracePeriod?: boolean,
): NotebookProgressStep | null => {
  const timestamp = new Date(getEventTimestamp(event)).getTime();
  const { reason, message, type } = event;

  if (CONTAINER_EVENT_REASONS.has(reason)) {
    // Longest-name-first prevents a short name from matching inside a longer sibling name.
    const matchCandidates = containerNames.toSorted((a, b) => b.length - a.length);
    let matchedContainer = matchCandidates.find((name) => message.includes(name));

    // For Created/Started, try parsing the container name directly from the message.
    if (!matchedContainer && (reason === 'Created' || reason === 'Started')) {
      const parsed = parseContainerNameFromMessage(message);
      if (parsed && containerNames.includes(parsed)) {
        matchedContainer = parsed;
      }
    }

    if (!matchedContainer) {
      return null;
    }

    const notebookContainerName =
      containerNames.find((n) => !AUTH_PROXY_NAMES.includes(n)) ?? containerNames[0];

    switch (reason) {
      case 'Pulling':
        return makeContainerStep(
          'pulling',
          matchedContainer,
          notebookContainerName,
          (f) => `Pulling ${f} image`,
          EventStatus.SUCCESS,
          timestamp,
        );
      case 'Pulled':
        return makeContainerStep(
          'pulled',
          matchedContainer,
          notebookContainerName,
          (f) => `${f} image pulled`,
          EventStatus.SUCCESS,
          timestamp,
        );
      case 'Created':
        return makeContainerStep(
          'created',
          matchedContainer,
          notebookContainerName,
          (f) => `${f} container created`,
          EventStatus.SUCCESS,
          timestamp,
        );
      case 'Started':
        return makeContainerStep(
          'started',
          matchedContainer,
          notebookContainerName,
          (f) => `${f} container started`,
          EventStatus.SUCCESS,
          timestamp,
        );
      case 'Killing':
        return makeContainerStep(
          'started',
          matchedContainer,
          notebookContainerName,
          (f) => `${f} container stopped`,
          EventStatus.WARNING,
          timestamp,
        );
      default:
        return null;
    }
  }

  // --- Pod-level events ---
  switch (reason) {
    case 'SuccessfulCreate':
      return {
        stepKind: 'pod_created',
        label: 'Pod created',
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'Scheduled':
      return {
        stepKind: 'pod_assigned',
        label: 'Pod assigned',
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'SuccessfulAttachVolume':
      return {
        stepKind: 'pvc_attached',
        label: 'PVC attached',
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'AddedInterface':
      return {
        stepKind: 'interface_added',
        label: 'Interface added',
        status: EventStatus.SUCCESS,
        timestamp,
      };
    case 'NotTriggerScaleUp':
      return {
        stepKind: 'pod_problem',
        label: 'There was a problem with the pod',
        description: 'Failed to scale-up',
        status: EventStatus.ERROR,
        timestamp,
      };
    case 'TriggeredScaleUp':
      return {
        stepKind: 'pod_problem',
        label: 'There was a problem with the pod',
        description: 'Pod triggered scale-up',
        status: EventStatus.INFO,
        timestamp,
      };
    case 'FailedCreate':
      return {
        stepKind: 'pod_problem',
        label: 'There was a problem with the pod',
        description: 'Failed to create pod',
        status: EventStatus.ERROR,
        timestamp,
      };
    default: {
      if (!gracePeriod && reason === 'FailedScheduling') {
        return {
          stepKind: 'pod_problem',
          label: 'There was a problem with the pod',
          description: 'Insufficient resources to start',
          status: EventStatus.ERROR,
          timestamp,
        };
      }
      if (!gracePeriod && reason === 'BackOff') {
        const primaryContainer =
          containerNames.find((n) => !AUTH_PROXY_NAMES.includes(n)) ?? containerNames[0];
        const description = message.toLowerCase().includes('pulling image')
          ? 'ImagePullBackOff'
          : 'CrashLoopBackOff';
        return {
          stepKind: 'container_problem',
          containerName: primaryContainer,
          label: 'There was a problem with the workbench container',
          description,
          status: EventStatus.ERROR,
          timestamp,
        };
      }
      if (type === 'Warning') {
        const primaryContainer =
          containerNames.find((n) => !AUTH_PROXY_NAMES.includes(n)) ?? containerNames[0];
        return {
          stepKind: 'container_problem',
          containerName: primaryContainer,
          label: 'There was a problem with the workbench container',
          description: 'Issue creating workbench container',
          status: EventStatus.WARNING,
          timestamp,
        };
      }
      return null;
    }
  }
};

/**
 * Severity within the "problem" band only (WARNING < ERROR).
 * Non-problem statuses (PENDING, SUCCESS, etc.) are intentionally absent so they
 * never participate in downgrade-prevention logic.
 */
const PROBLEM_SEVERITY: Partial<Record<EventStatus, number>> = {
  [EventStatus.WARNING]: 1,
  [EventStatus.ERROR]: 2,
};

/** Returns true when replacing `current` with `next` would downgrade a problem status. */
const isProblemDowngrade = (current: EventStatus, next: EventStatus): boolean =>
  (PROBLEM_SEVERITY[current] ?? -1) > (PROBLEM_SEVERITY[next] ?? -1);

export const useNotebookStatus = (
  spawnInProgress: boolean,
  notebook: NotebookKind | null,
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
    return [null, []];
  }

  const [filteredEvents, thisInstanceEvents, gracePeriod] = filterEvents(events, lastActivity);
  if (filteredEvents.length === 0) {
    return [null, thisInstanceEvents];
  }

  const containerNames = notebook.spec.template.spec.containers.map((c) => c.name);

  // Among events sharing the latest timestamp, pick the one with the highest derived severity.
  // This prevents a lower-severity companion event (e.g. "Warning Failed ImagePullBackOff")
  // from overriding a higher-severity one (e.g. "Normal BackOff" → ERROR) when they arrive
  // at the same instant.
  const latestTimestamp = getEventTimestamp(filteredEvents[filteredEvents.length - 1]);
  const lastItem = filteredEvents
    .filter((e) => getEventTimestamp(e) === latestTimestamp)
    .reduce((best, evt) => {
      const bestStep = getNotebookEventStatus(best, containerNames, gracePeriod);
      const evtStep = getNotebookEventStatus(evt, containerNames, gracePeriod);
      const bestStatus =
        bestStep?.status ?? (best.type === 'Warning' ? EventStatus.WARNING : EventStatus.INFO);
      const evtStatus =
        evtStep?.status ?? (evt.type === 'Warning' ? EventStatus.WARNING : EventStatus.INFO);
      return (PROBLEM_SEVERITY[evtStatus] ?? -1) >= (PROBLEM_SEVERITY[bestStatus] ?? -1)
        ? evt
        : best;
    });

  const eventStep = getNotebookEventStatus(lastItem, containerNames, gracePeriod);
  const statusLabel = eventStep ? eventStep.description || eventStep.label : lastItem.reason;
  const currentStatus =
    eventStep?.status ?? (lastItem.type === 'Warning' ? EventStatus.WARNING : EventStatus.INFO);

  return [
    {
      currentEvent: statusLabel,
      currentEventReason: lastItem.reason,
      currentEventDescription: lastItem.message,
      currentStatus,
    },
    thisInstanceEvents,
  ];
};

export const compareProgressSteps = (a: NotebookProgressStep, b: NotebookProgressStep): number => {
  const timeDiff = a.timestamp - b.timestamp;
  return timeDiff !== 0
    ? timeDiff
    : (STEP_KIND_ORDER[a.stepKind] ?? 99) - (STEP_KIND_ORDER[b.stepKind] ?? 99);
};

/** Returns the ordered notebook startup progress steps, derived from the pod spec containers. */
export const useNotebookProgress = (
  notebook: NotebookKind | null,
  isRunning: boolean,
  isStopping: boolean,
  isStopped: boolean,
  events: EventKind[],
  kueueStatus: KueueWorkloadStatusWithMessage | null,
  containerStatuses: PodContainerStatus[] = [],
): NotebookProgressStep[] => {
  const isRecovery = isNotebookRestart(notebook);
  const progressSteps = buildInitialProgressSteps(
    notebook,
    isStopped,
    isStopping,
    kueueStatus,
    isRecovery,
  );

  const containers = notebook?.spec.template.spec.containers ?? [];
  const containerNames = containers.map((c) => c.name);

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

  // Search top-level steps and subSteps (pulling/pulled/created live inside started).
  const findStepDeep = (
    stepsArr: NotebookProgressStep[],
    stepKind: NotebookProgressStepKind,
    containerName?: string,
  ): NotebookProgressStep | undefined => {
    for (const s of stepsArr) {
      if (s.stepKind === stepKind && s.containerName === containerName) return s;
      if (s.subSteps) {
        const sub = s.subSteps.find(
          (ss) => ss.stepKind === stepKind && ss.containerName === containerName,
        );
        if (sub) return sub;
      }
    }
    return undefined;
  };

  const currentProgress = progressEvents
    .map((event) => getNotebookEventStatus(event, containerNames, gracePeriod))
    .filter((s): s is NotebookProgressStep => s !== null)
    .toSorted(compareProgressSteps);

  currentProgress.forEach((eventStep) => {
    const match = findStepDeep(progressSteps, eventStep.stepKind, eventStep.containerName);
    if (match) {
      // Downgrade-prevention only applies to same-timestamp companion events
      // (e.g. K8s fires "Warning Failed" alongside "BackOff → ERROR" at the same instant).
      // Events at a later timestamp always win — they represent genuine forward progress
      // (e.g. "Pulled" SUCCESS after a previous "Failed" WARNING).
      const isSameTimestamp = match.timestamp === eventStep.timestamp;
      match.timestamp = eventStep.timestamp;
      if (!isSameTimestamp || !isProblemDowngrade(match.status, eventStep.status)) {
        match.status = eventStep.status;
        if (eventStep.description) {
          match.description = eventStep.description;
        }
      }
    }
  });

  // Catch-up: pod_assigned SUCCESS → pod_created SUCCESS.
  const podAssigned = progressSteps.find((s) => s.stepKind === 'pod_assigned');
  if (podAssigned?.status === EventStatus.SUCCESS) {
    const podCreated = progressSteps.find((s) => s.stepKind === 'pod_created');
    if (podCreated?.status === EventStatus.PENDING) {
      podCreated.status = EventStatus.SUCCESS;
    }
  }

  // Bubble up: pod_assigned mirrors its Kueue sub-step status unless the sub-step is SUCCESS.
  const kueueSub = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
  if (kueueSub && kueueSub.status !== EventStatus.SUCCESS && podAssigned) {
    podAssigned.status = kueueSub.status;
  }

  // Catch up sub-steps when started is SUCCESS; bubble IN_PROGRESS up when sub-steps are active.
  containers.forEach((container) => {
    const started = progressSteps.find(
      (s) => s.stepKind === 'started' && s.containerName === container.name,
    );
    if (!started) return;

    if (started.status === EventStatus.SUCCESS) {
      const subs = started.subSteps;
      if (subs) {
        for (let si = 0; si < subs.length; si++) {
          if (subs[si].status === EventStatus.PENDING) {
            subs[si].status = EventStatus.SUCCESS;
          }
        }
      }
      // Also catch up interface_added — it fires before containers but may be missed.
      const ifaceStep = progressSteps.find((s) => s.stepKind === 'interface_added');
      if (ifaceStep?.status === EventStatus.PENDING) {
        ifaceStep.status = EventStatus.SUCCESS;
      }
    } else if (started.status === EventStatus.PENDING && started.subSteps) {
      const hasError = started.subSteps.some((sub) => sub.status === EventStatus.ERROR);
      const hasActive = started.subSteps.some((sub) => sub.status !== EventStatus.PENDING);
      if (hasError) {
        started.status = EventStatus.ERROR;
      } else if (hasActive) {
        started.status = EventStatus.IN_PROGRESS;
        started.isExpanded = true;
      }
    }
  });

  // EC3: mark workbench_started SUCCESS when all containers are started (via events or container statuses).
  if (isRunning) {
    const allEventStepsStarted =
      containers.length === 0 ||
      containers.every((container) => {
        const startedStep = progressSteps.find(
          (s) => s.stepKind === 'started' && s.containerName === container.name,
        );
        return startedStep?.status === EventStatus.SUCCESS;
      });

    const allContainerStatusesRunning =
      containers.length > 0 &&
      containers.every((container) => {
        const cs = containerStatuses.find((s) => s.name === container.name);
        return !!cs && cs.ready && cs.state?.running != null;
      });

    if (allEventStepsStarted || allContainerStatusesRunning) {
      if (allContainerStatusesRunning && !allEventStepsStarted) {
        containers.forEach((container) => {
          const started = progressSteps.find(
            (p) => p.stepKind === 'started' && p.containerName === container.name,
          );
          if (started) {
            started.status = EventStatus.SUCCESS;
            const subs = started.subSteps;
            if (subs) {
              for (let si = 0; si < subs.length; si++) {
                if (subs[si].status === EventStatus.PENDING) {
                  subs[si].status = EventStatus.SUCCESS;
                }
              }
            }
          }
        });
      }
      const workbenchStarted = progressSteps.find((s) => s.stepKind === 'workbench_started');
      if (workbenchStarted) {
        workbenchStarted.status = EventStatus.SUCCESS;
      }
    }
  }

  // Once fully started, catch up any remaining PENDING steps and their sub-steps.
  const workbenchStarted = progressSteps.find((s) => s.stepKind === 'workbench_started');
  if (workbenchStarted?.status === EventStatus.SUCCESS) {
    progressSteps.forEach((s, i) => {
      if (s.status === EventStatus.PENDING && !OPTIONAL_STEP_KINDS.has(s.stepKind)) {
        progressSteps[i].status = EventStatus.SUCCESS;
      }
      const subs = progressSteps[i].subSteps;
      if (subs) {
        for (let si = 0; si < subs.length; si++) {
          if (subs[si].status === EventStatus.PENDING) {
            subs[si].status = EventStatus.SUCCESS;
          }
        }
      }
    });
  }

  // Filter out optional steps that never received an event (still PENDING).
  return progressSteps.filter(
    (s) => !(OPTIONAL_STEP_KINDS.has(s.stepKind) && s.status === EventStatus.PENDING),
  );
};

export const useCheckJupyterEnabled = (): boolean => {
  const { dashboardConfig } = useAppContext();
  return dashboardConfig.spec.notebookController?.enabled !== false;
};
