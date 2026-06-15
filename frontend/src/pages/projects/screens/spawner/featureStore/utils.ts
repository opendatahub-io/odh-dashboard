import { NotebookKind } from '#~/k8sTypes';
import { SelectionOptions } from '#~/components/MultiSelection';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
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
): WorkbenchFeatureStoreConfig[] => {
  const feastConfigAnnotation = notebook.metadata.annotations?.[FEAST_CONFIG_ANNOTATION];
  if (!feastConfigAnnotation) {
    return [];
  }

  const projectNames = feastConfigAnnotation.split(',').map((name) => name.trim());
  const matched: WorkbenchFeatureStoreConfig[] = [];

  projectNames.forEach((projectName) => {
    const found = availableFeatureStores.find((fs) => fs.projectName === projectName);
    if (found) {
      matched.push(found);
    }
  });

  return matched;
};

export const convertFeatureStoresToSelectionOptions = (
  featureStoreConfigs: WorkbenchFeatureStoreConfig[],
  selectedFeatureStores: WorkbenchFeatureStoreConfig[],
): SelectionOptions[] => {
  const availableOptions = featureStoreConfigs.map((config) => ({
    id: config.projectName,
    name: config.projectName,
    selected: selectedFeatureStores.some((selected) => selected.projectName === config.projectName),
  }));

  const selectedKeys = new Set(availableOptions.map((opt) => opt.id));
  const missingSelected = selectedFeatureStores
    .filter(
      (selected) =>
        !selectedKeys.has(selected.projectName) &&
        !featureStoreConfigs.some((config) => config.projectName === selected.projectName),
    )
    .map((selected) => ({
      id: selected.projectName,
      name: selected.projectName,
      selected: true,
    }));

  return [...availableOptions, ...missingSelected];
};

export const getSelectedFeatureStoresFromSelections = (
  newSelections: SelectionOptions[],
  featureStoreConfigs: WorkbenchFeatureStoreConfig[],
  selectedFeatureStores: WorkbenchFeatureStoreConfig[],
): WorkbenchFeatureStoreConfig[] => {
  const allConfigs = [...featureStoreConfigs, ...selectedFeatureStores];

  return newSelections
    .filter((option) => option.selected)
    .map((option) => {
      const projectName = String(option.id);
      return allConfigs.find((config) => config.projectName === projectName);
    })
    .filter((config): config is WorkbenchFeatureStoreConfig => config !== undefined);
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
