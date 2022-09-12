import * as React from 'react';
import * as _ from 'lodash';
import { AxiosError } from 'axios';
import { createRoleBinding, getRoleBinding } from '../services/roleBindingService';
import {
  EnvVarReducedTypeKeyValues,
  EnvVarResource,
  EnvVarResourceType,
  EventStatus,
  K8sEvent,
  K8sResourceCommon,
  Notebook,
  NotebookControllerUserState,
  NotebookStatus,
  PersistentVolumeClaim,
  ResourceCreator,
  ResourceDeleter,
  ResourceGetter,
  ResourceReplacer,
  RoleBinding,
  VariableRow,
} from '../types';
import { NotebookControllerContext } from '../pages/notebookController/NotebookControllerContext';
import { useUser } from '../redux/selectors';
import { EMPTY_USER_STATE } from '../pages/notebookController/const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import { useWatchNotebookEvents } from './useWatchNotebookEvents';
import useNamespaces from '../pages/notebookController/useNamespaces';

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
): Promise<T | undefined> => {
  return await fetchFunc(namespace, name).catch(async (e: AxiosError) => {
    if (e.response?.status === 404) {
      if (createFunc && createBody) {
        return await createFunc(createBody);
      } else {
        return undefined;
      }
    }
    throw e;
  });
};

/** Classify environment variables as ConfigMap or Secret */
export const classifyEnvVars = (variableRows: VariableRow[]): EnvVarReducedTypeKeyValues => {
  return variableRows.reduce(
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
};

/** Check whether to get, create, replace or delete the environment variable files (Secret and ConfigMap) */
export const verifyEnvVars = async (
  name: string,
  namespace: string,
  kind: string,
  envVars: Record<string, string>,
  fetchFunc: ResourceGetter<EnvVarResource>,
  createFunc: ResourceCreator<EnvVarResource>,
  replaceFunc: ResourceReplacer<EnvVarResource>,
  deleteFunc: ResourceDeleter,
): Promise<void> => {
  if (!envVars) {
    const resource = await verifyResource(name, namespace, fetchFunc);
    if (resource) {
      await deleteFunc(namespace, name);
    }
    return;
  }

  const body =
    kind === EnvVarResourceType.Secret
      ? {
          stringData: envVars,
          type: 'Opaque',
        }
      : {
          data: envVars,
        };
  const newResource: EnvVarResource = {
    apiVersion: 'v1',
    kind,
    metadata: {
      name,
      namespace,
    },
    ...body,
  };
  const response = await verifyResource<EnvVarResource>(
    name,
    namespace,
    fetchFunc,
    createFunc,
    newResource,
  );
  if (!_.isEqual(response?.data, envVars)) {
    await replaceFunc(newResource);
  }
};

export const generatePvc = (
  pvcName: string,
  namespace: string,
  pvcSize: string,
): PersistentVolumeClaim => ({
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: pvcName,
    namespace,
  },
  spec: {
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage: pvcSize,
      },
    },
    volumeMode: 'Filesystem',
  },
  status: {
    phase: 'Pending',
  },
});

export const getNotebookControllerUserState = (
  notebook: Notebook | null,
  loggedInUser: string,
): NotebookControllerUserState | null => {
  if (!notebook?.metadata?.annotations || !notebook?.metadata?.labels) return null;

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

const useLastOpenTime = (open: boolean): Date | null => {
  // TODO: This is a hack until we get a cleaner way of using values that are immutable
  // We may be able to use kube stop annotation and/or the last activity -- but stability is important atm
  const ref = React.useRef<Date | null>(null);
  if (ref.current && !open) {
    // Modal closing, clean up
    ref.current = null;
  } else if (!ref.current && open) {
    // Modal is opening, hold date
    ref.current = new Date();
  }

  return ref.current;
};

export const useNotebookStatus = (
  spawnInProgress: boolean,
): [status: NotebookStatus | null, events: K8sEvent[]] => {
  const { notebookNamespace } = useNamespaces();
  const { currentUserNotebook: notebook } = React.useContext(NotebookControllerContext);

  const events = useWatchNotebookEvents(
    notebookNamespace,
    notebook?.metadata.name || '',
    spawnInProgress,
  );

  // TODO: Use last activity to fetch latest events
  // const lastActivity = notebook?.metadata.annotations?.['notebooks.kubeflow.org/last-activity'];
  const startOfOpen = useLastOpenTime(spawnInProgress);
  if (!startOfOpen) {
    // Modal is closed, we don't have a filter time, ignore
    return [null, []];
  }

  const filteredEvents = events.filter((event) => new Date(event.lastTimestamp) > startOfOpen);
  if (filteredEvents.length === 0) {
    // We filter out all the events, nothing to show
    return [null, []];
  }

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
      default: {
        currentEvent = 'Error creating oauth proxy container';
        status = EventStatus.ERROR;
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
      default: {
        currentEvent = 'Error creating notebook container';
        status = EventStatus.ERROR;
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
    filteredEvents,
  ];
};
