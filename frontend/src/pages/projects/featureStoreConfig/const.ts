import { SortableData } from '#~/components/table';
import { FeatureStoreClientConfig, FilterOptions, FilterData } from './types';

const sortByAccessibilityFirst = (
  a: FeatureStoreClientConfig,
  b: FeatureStoreClientConfig,
  comparator: (a: FeatureStoreClientConfig, b: FeatureStoreClientConfig) => number,
): number => {
  const aHasAccess = a.hasAccessToFeatureStore === true;
  const bHasAccess = b.hasAccessToFeatureStore === true;

  if (aHasAccess !== bHasAccess) {
    return aHasAccess ? -1 : 1;
  }

  return comparator(a, b);
};

export const featureStoreColumns: SortableData<FeatureStoreClientConfig>[] = [
  {
    field: 'checkbox',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      sortByAccessibilityFirst(a, b, (configA, configB) =>
        configA.configName.localeCompare(configB.configName),
      ),
    width: 30,
  },
  {
    field: 'repository',
    label: 'Associated Feature Store Repository',
    sortable: (a: FeatureStoreClientConfig, b: FeatureStoreClientConfig): number => {
      const getProjectName = (config: FeatureStoreClientConfig): string => {
        const yamlContent = config.configMap.data?.['feature_store.yaml'];
        if (yamlContent) {
          const projectMatch = yamlContent.match(/^project:\s*(.+)$/m);
          if (projectMatch) {
            return projectMatch[1].trim();
          }
        }
        return `${config.configMap.metadata.namespace || 'unknown'}/${
          config.configMap.metadata.name || 'unknown'
        }`;
      };

      return sortByAccessibilityFirst(a, b, (configA, configB) =>
        getProjectName(configA).localeCompare(getProjectName(configB)),
      );
    },
    width: 40,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a: FeatureStoreClientConfig, b: FeatureStoreClientConfig): number => {
      return sortByAccessibilityFirst(a, b, (configA, configB) => {
        const aTime = new Date(configA.configMap.metadata.creationTimestamp || 0).getTime();
        const bTime = new Date(configB.configMap.metadata.creationTimestamp || 0).getTime();
        return aTime - bTime;
      });
    },
    width: 30,
  },
];

export const filterOptions = {
  [FilterOptions.NAME]: 'Name',
  [FilterOptions.PROJECT]: 'Associated Feature Store Repository',
  [FilterOptions.CREATED]: 'Created',
};

export const TEST_IDS = {
  NAME_FILTER: 'name-filter',
  PROJECT_FILTER: 'project-filter',
  CREATED_FILTER: 'created-filter',
  FEATURE_STORE_TABLE: 'feature-store-table',
  FEATURE_STORE_FILTER: 'feature-store-filter',
  SHOW_ONLY_ACCESSIBLE_TOGGLE: 'show-only-accessible-toggle',
} as const;

export const initialFilterData: FilterData = {
  [FilterOptions.NAME]: '',
  [FilterOptions.PROJECT]: '',
  [FilterOptions.CREATED]: '',
};
