import { NotebookKind } from '#~/k8sTypes';
import type {
  WorkbenchFeatureStoreConfig,
  SelectedFeatureStoreConfig,
} from './useWorkbenchFeatureStores';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';
import { FEAST_CONFIG_ANNOTATION, FEAST_INTEGRATION_LABEL } from './const';

export type NotebookFeatureStore = {
  namespace: string;
  configName: string;
  projectName: string;
};

export const FEATURE_STORE_CODE_HELP =
  'Example code showing how to connect to the selected feature stores using the Feast SDK. The feature store configuration files are automatically mounted in your notebook.';

export const FEATURE_STORE_CODE_DESCRIPTION =
  "Modify and run this example code in your workbench to create a FeatureStore object for each connected feature store. Make sure to update each object's name and the path to the corresponding client configuration YAML file. After creation, you can access this code in the";

export const FEATURE_STORE_EMPTY_STATE_TITLE = 'No selected feature store';

export const FEATURE_STORE_EMPTY_STATE_BODY =
  'Select feature stores to connect to this workbench. Features in selected feature stores have read and write access to this workbench.';

export const FEATURE_STORE_UNAVAILABLE_TOOLTIP =
  'This feature store is no longer available. It may have been deleted or access has been revoked.';

export const removeFeatureStoreProjectById = (
  configs: SelectedFeatureStoreConfig[],
  projectId: string,
): SelectedFeatureStoreConfig[] =>
  configs.filter((config) => getFeatureStoreProjectId(config) !== projectId);

export const generateFeatureStoreCode = (): string => {
  return `from feast import FeatureStore
fs_banking = FeatureStore(fs_yaml_file='/opt/app-root/config/feast_configs/fs_banking.yaml')
fs_banking.list_feature_views()
fs_banking.get_historical_features(.....)
fs_banking.get_online_features(.....)`;
};

export const getFeatureStoresFromNotebook = (
  notebook: NotebookKind,
  availableFeatureStores: WorkbenchFeatureStoreConfig[],
): SelectedFeatureStoreConfig[] => {
  const feastConfigAnnotation = notebook.metadata.annotations?.[FEAST_CONFIG_ANNOTATION];
  if (!feastConfigAnnotation) {
    return [];
  }

  const projectNames = feastConfigAnnotation.split(',').map((name) => name.trim());
  const matched: SelectedFeatureStoreConfig[] = [];
  const usedConfigKeys = new Set<string>();
  const processedProjectNames = new Set<string>();

  projectNames.forEach((projectName) => {
    if (!projectName || processedProjectNames.has(projectName)) {
      return;
    }
    processedProjectNames.add(projectName);

    const found = availableFeatureStores.find(
      (config) =>
        config.projectName === projectName && !usedConfigKeys.has(getFeatureStoreProjectId(config)),
    );

    if (found) {
      matched.push(found);
      usedConfigKeys.add(getFeatureStoreProjectId(found));
    } else {
      matched.push({
        namespace: '',
        configName: '',
        projectName,
        configMap: null,
        hasAccessToFeatureStore: false,
        permissionLevel: [],
        isUnavailable: true,
      });
    }
  });

  return matched;
};

export const mapFeatureStoresForNotebook = <T extends NotebookFeatureStore>(
  selectedFeatureStores: T[],
): NotebookFeatureStore[] => {
  return selectedFeatureStores.map((fs) => ({
    namespace: fs.namespace,
    configName: fs.configName,
    projectName: fs.projectName,
  }));
};

export const generateFeastMetadata = (
  selectedFeatureStores: WorkbenchFeatureStoreConfig[],
  existingNotebook?: NotebookKind,
  isUpdate = false,
): {
  featureStores: NotebookFeatureStore[];
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
} => {
  const featureStores = mapFeatureStoresForNotebook(selectedFeatureStores);
  const hasFeatureStores = featureStores.length > 0;
  const feastConfigAnnotation = hasFeatureStores
    ? featureStores.map((fs) => fs.projectName).join(',')
    : null;

  const labels: Record<string, string> = {};
  const annotations: Record<string, string> = {};

  if (hasFeatureStores) {
    labels[FEAST_INTEGRATION_LABEL] = 'true';
    if (feastConfigAnnotation) {
      annotations[FEAST_CONFIG_ANNOTATION] = feastConfigAnnotation;
    }
  } else if (isUpdate && existingNotebook) {
    if (existingNotebook.metadata.labels?.[FEAST_INTEGRATION_LABEL]) {
      labels[FEAST_INTEGRATION_LABEL] = 'true';
    }
    if (existingNotebook.metadata.annotations?.[FEAST_CONFIG_ANNOTATION]) {
      annotations[FEAST_CONFIG_ANNOTATION] = '';
    }
  }

  return {
    featureStores,
    ...(Object.keys(annotations).length > 0 && { annotations }),
    ...(Object.keys(labels).length > 0 && { labels }),
  };
};
