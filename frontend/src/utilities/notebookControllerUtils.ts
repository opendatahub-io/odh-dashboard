import * as _ from 'lodash';
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
  DeleteStatus,
  EnvVarReducedType,
  EnvVarReducedTypeKeyValues,
  EnvVarResource,
  EnvVarResourceType,
  Notebook,
  NotebookControllerUserState,
  PersistentVolumeClaim,
  Secret,
  VariableRow,
} from '../types';

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
  deleteFunc: (resourceName: string) => Promise<DeleteStatus>,
): Promise<void> => {
  if (!envVars) {
    const resource = await verifyResource(name, fetchFunc);
    if (resource) {
      deleteFunc(name);
    }
  } else {
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
    EnvVarResourceType.Secret,
    envVars.secrets,
    getSecret,
    createSecret,
    replaceSecret,
    deleteSecret,
  );
  await verifyEnvVars(
    envVarFileName,
    namespace,
    EnvVarResourceType.ConfigMap,
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

export const checkNotebookRunning = (notebook?: Notebook): boolean =>
  !!(
    notebook?.status?.readyReplicas &&
    notebook?.status?.readyReplicas >= 1 &&
    notebook?.metadata.annotations?.['opendatahub.io/link']
  );

export const getUserStateFromDashboardConfig = (
  translatedUsername: string,
  notebookControllerState: NotebookControllerUserState[],
): NotebookControllerUserState | undefined =>
  notebookControllerState.find((state) => usernameTranslate(state.user) === translatedUsername);
