import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';

const NIMAccountModel = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

const ConfigMapModel = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  plural: 'configmaps',
};

type NIMAccountKind = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  status?: {
    nimConfig?: {
      name: string;
    };
  };
};

type ConfigMapKind = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  data?: Record<string, string>;
};

export type ModelInfo = {
  name: string;
  displayName: string;
  shortDescription: string;
  namespace: string;
  tags: string[];
  latestTag: string;
  updatedDate: string;
};

export const normalizeVersion = (tag: string): string => {
  if (/^\d+(\.\d+)*$/.test(tag)) {
    const parts = tag.split('.').map(Number);
    while (parts.length < 3) {
      parts.push(0);
    }
    return parts.join('.');
  }
  return tag;
};

export const getNIMImageName = (
  modelNamespace: string,
  modelName: string,
  version: string,
): string => `nvcr.io/${modelNamespace}/${modelName}:${version}`;

export const fetchNIMModelNames = async (dashboardNamespace: string): Promise<ModelInfo[]> => {
  const accounts = await k8sListResource<NIMAccountKind>({
    model: NIMAccountModel,
    queryOptions: { ns: dashboardNamespace },
  }).then((result) => result.items);

  if (accounts.length === 0) {
    return [];
  }

  const account = accounts[0];
  const configMapName = account.status?.nimConfig?.name;
  if (!configMapName) {
    return [];
  }

  const configMap = await k8sGetResource<ConfigMapKind>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: dashboardNamespace },
  });

  if (!configMap.data || Object.keys(configMap.data).length === 0) {
    return [];
  }

  const modelInfos: ModelInfo[] = [];
  for (const [key, value] of Object.entries(configMap.data)) {
    try {
      const modelData = JSON.parse(value);
      modelInfos.push({
        name: key,
        displayName: modelData.displayName,
        shortDescription: modelData.shortDescription,
        namespace: modelData.namespace,
        tags: modelData.tags,
        latestTag: modelData.latestTag,
        updatedDate: modelData.updatedDate,
      });
    } catch {
      // skip entries that can't be parsed
    }
  }

  return modelInfos;
};
