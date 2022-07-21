import * as _ from 'lodash-es';
import { AxiosError } from 'axios';
import {
  createConfigMap,
  deleteConfigMap,
  getConfigMap,
  replaceConfigMap,
} from '../services/configMapService';
import { createSecret, deleteSecret, getSecret, replaceSecret } from '../services/secretsService';
import {
  ConfigMap,
  EnvVarReducedType,
  EnvVarReducedTypeKeyValues,
  EnvVarResource,
  EnvVarResourceKind,
  OdhApplication,
  OdhDocument,
  OdhDocumentType,
  PersistentVolumeClaim,
  Secret,
  VariableRow,
} from '../types';
import { CATEGORY_ANNOTATION, ODH_PRODUCT_NAME } from './const';

export const makeCardVisible = (id: string): void => {
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, 100);
};

export const getDuration = (minutes = 0): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hoursString = hours > 0 ? `${hours} ${hours > 1 ? 'hours' : 'hour'} ` : '';
  if (hours > 0) {
    return `${hoursString}${mins > 0 ? ' +' : ''}`;
  }

  return mins > 0 ? `${mins} ${mins > 1 ? 'minutes' : 'minute'}` : '';
};

export const calculateRelativeTime = (startTime: Date, endTime: Date): string => {
  const start = startTime.getTime();
  const end = endTime.getTime();

  const secondsAgo = (end - start) / 1000;
  const minutesAgo = secondsAgo / 60;
  const hoursAgo = minutesAgo / 60;

  if (minutesAgo > 90) {
    const count = Math.round(hoursAgo);
    return `about ${count} hours ago`;
  }
  if (minutesAgo > 45) {
    return 'about an hour ago';
  }
  if (secondsAgo > 90) {
    const count = Math.round(minutesAgo);
    return `about ${count} minutes ago`;
  }
  if (secondsAgo > 45) {
    return 'about a minute ago';
  }
  return 'a few seconds ago';
};

// Returns the possible colors allowed for a patternly-react Label component
// There is no type defined for this so it must be exactly one of the possible strings
// required :/
// FixMe: Fix when https://github.com/patternfly/patternfly-react/issues/5895 is resolved
export const getLabelColorForDocType = (
  docType: string,
): 'blue' | 'cyan' | 'green' | 'orange' | 'purple' | 'red' | 'grey' => {
  switch (docType) {
    case OdhDocumentType.Documentation:
      return 'orange';
    case OdhDocumentType.Tutorial:
      return 'cyan';
    case OdhDocumentType.QuickStart:
      return 'green';
    case OdhDocumentType.HowTo:
      return 'orange';
    default:
      return 'grey';
  }
};
export const combineCategoryAnnotations = (doc: OdhDocument, app: OdhApplication): void => {
  const docCategories = (doc.metadata.annotations?.[CATEGORY_ANNOTATION] ?? '')
    .split(',')
    .map((c) => c.trim());
  const appCategories = (app.metadata.annotations?.[CATEGORY_ANNOTATION] ?? '')
    .split(',')
    .map((c) => c.trim());

  const combined = appCategories.reduce((acc, category) => {
    if (category && !acc.includes(category)) {
      acc.push(category);
    }
    return acc;
  }, docCategories);

  doc.metadata.annotations = {
    ...(doc.metadata.annotations || {}),
    [CATEGORY_ANNOTATION]: combined.join(','),
  };
};

export const matchesCategories = (
  odhDoc: OdhDocument,
  category: string,
  favorites: string[],
): boolean => {
  if (!category) {
    return true;
  }
  if (category === 'Favorites') {
    return favorites.includes(odhDoc.metadata.name);
  }
  return odhDoc.metadata.annotations?.[CATEGORY_ANNOTATION]?.includes(category) ?? false;
};

export const matchesSearch = (odhDoc: OdhDocument, filterText: string): boolean => {
  const searchText = filterText.toLowerCase();
  const {
    metadata: { name },
    spec: { displayName, description, appName, provider },
  } = odhDoc;
  return (
    !searchText ||
    name.toLowerCase().includes(searchText) ||
    (appName && appName.toLowerCase().includes(searchText)) ||
    (provider && provider.toLowerCase().includes(searchText)) ||
    displayName.toLowerCase().includes(searchText) ||
    (description?.toLowerCase().includes(searchText) ?? false)
  );
};

export const isRedHatSupported = (app: OdhApplication): boolean => {
  const support = (app.spec.support || '').toLowerCase();
  return support === ODH_PRODUCT_NAME || support === 'redhat';
};

export const getHourAndMinuteByTimeout = (timeout: number): { hour: number; minute: number } => {
  const total_minutes = timeout / 60;
  const hour = Math.floor(total_minutes / 60);
  const minute = total_minutes % 60;
  return { hour, minute };
};

export const getTimeoutByHourAndMinute = (hour: number, minute: number): number =>
  (hour * 60 + minute) * 60;

export const usernameTranslate = (username: string): string =>
  username
    .replace(/-/g, '-2d')
    .replace(/@/g, '-40')
    .replace(/\./g, '-2e')
    .replace(/:/g, '-3a')
    .toLowerCase();

export const generateNotebookNameFromUsername = (username: string): string =>
  `jupyter-nb-${usernameTranslate(username)}`;

export const generatePvcNameFromUsername = (username: string): string =>
  `jupyterhub-nb-${usernameTranslate(username)}-pvc`;

export const generateEnvVarFileNameFromUsername = (username: string): string =>
  `jupyterhub-singleuser-profile-${usernameTranslate(username)}-envs`;

/** Verify whether a resource is on the cluster
 * If it exists, return the resource object, else, return null
 * If the createFunc is also passed, create it when it doesn't exist
 */
export const verifyResource = async <T>(
  name: string,
  fetchFunc: (resourceName: string) => Promise<T>,
  createFunc?: (resource: T) => Promise<T>,
  createBody?: T,
): Promise<T | undefined> => {
  return await fetchFunc(name).catch(async (e: AxiosError) => {
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
  fetchFunc: (resourceName: string) => Promise<EnvVarResource>,
  createFunc: (resource: Secret | ConfigMap) => Promise<EnvVarResource>,
  replaceFunc: (resourceName: string, resource: EnvVarResource) => Promise<EnvVarResource>,
  deleteFunc: (resourceName: string) => Promise<void>,
): Promise<void> => {
  if (!envVars) {
    const resource = await verifyResource(name, fetchFunc);
    if (resource) {
      deleteFunc(name);
    }
  } else {
    const body =
      kind === EnvVarResourceKind.Secret
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
    const response = await verifyResource<EnvVarResource>(name, fetchFunc, createFunc, newResource);
    if (!_.isEqual(response?.data, envVars)) {
      await replaceFunc(name, newResource);
    }
  }
};

/** Update the config map and secret file on the cluster */
export const checkEnvVarFile = async (
  username: string,
  namespace: string,
  variableRows: VariableRow[],
): Promise<EnvVarReducedType> => {
  const envVarFileName = generateEnvVarFileNameFromUsername(username);
  const envVars = classifyEnvVars(variableRows);
  await verifyEnvVars(
    envVarFileName,
    namespace,
    EnvVarResourceKind.Secret,
    envVars.secrets,
    getSecret,
    createSecret,
    replaceSecret,
    deleteSecret,
  );
  await verifyEnvVars(
    envVarFileName,
    namespace,
    EnvVarResourceKind.ConfigMap,
    envVars.configMap,
    getConfigMap,
    createConfigMap,
    replaceConfigMap,
    deleteConfigMap,
  );
  return { envVarFileName, ...envVars };
};

export const generatePvc = (pvcName: string, pvcSize: string): PersistentVolumeClaim => ({
  apiVersion: 'v1',
  kind: 'PersistentVolumeClaim',
  metadata: {
    name: pvcName,
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
