import * as React from 'react';
import { Content, ContentVariants, Divider, Flex } from '@patternfly/react-core';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import {
  ModelCatalogNumberFilterKey,
  ModelCatalogStringFilterKey,
  MODEL_CATALOG_FILTER_CATEGORY_NAMES,
  MODEL_CATALOG_TASK_NAME_MAPPING,
  MODEL_CATALOG_PROVIDER_NAME_MAPPING,
  MODEL_CATALOG_VALIDATED_CONFIGURATION_NAME_MAPPING,
  MODEL_CATALOG_ASIAN_LANGUAGES_DETAILS,
  MODEL_CATALOG_EUROPEAN_LANGUAGES_DETAILS,
  MODEL_CATALOG_MIDDLE_EASTERN_AND_OTHER_LANGUAGES_DETAILS,
  ModelCatalogTensorType,
} from '~/concepts/modelCatalog/const';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  CatalogFilterPanel,
  useCatalogFilterConfigs,
  type FilterPanelItem,
  type StringFilterPanelItem,
} from '~/app/shared/components/catalog';
import { MODEL_CATALOG_EVENTS, getToggledFilterValue } from '~/app/pages/modelCatalog/tracking';
import ModelPerformanceViewToggleCard from './ModelPerformanceViewToggleCard';
import SidebarSliderFilter from './SidebarSliderFilter';

const BASIC_STRING_FILTER_KEYS: ModelCatalogStringFilterKey[] = [
  ModelCatalogStringFilterKey.TASK,
  ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION,
  ModelCatalogStringFilterKey.PROVIDER,
  ModelCatalogStringFilterKey.LICENSE,
  ModelCatalogStringFilterKey.LANGUAGE,
  ModelCatalogStringFilterKey.TENSOR_TYPE,
];

const LANGUAGE_NAME_MAPPING: Record<string, string> = {
  ...MODEL_CATALOG_EUROPEAN_LANGUAGES_DETAILS,
  ...MODEL_CATALOG_ASIAN_LANGUAGES_DETAILS,
  ...MODEL_CATALOG_MIDDLE_EASTERN_AND_OTHER_LANGUAGES_DETAILS,
};

const LABEL_MAPPINGS: Record<string, Record<string, string>> = {
  [ModelCatalogStringFilterKey.TASK]: MODEL_CATALOG_TASK_NAME_MAPPING,
  [ModelCatalogStringFilterKey.PROVIDER]: MODEL_CATALOG_PROVIDER_NAME_MAPPING,
  [ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION]:
    MODEL_CATALOG_VALIDATED_CONFIGURATION_NAME_MAPPING,
  [ModelCatalogStringFilterKey.LANGUAGE]: LANGUAGE_NAME_MAPPING,
  [ModelCatalogStringFilterKey.TENSOR_TYPE]: ModelCatalogTensorType,
};

const ModelCatalogFilters: React.FC = () => {
  const { filterOptions, filterOptionsLoaded, filterOptionsLoadError, filters, setFilters } =
    React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();

  const onFilterChange = React.useCallback(
    (key: string, values: string[]) => {
      const match = BASIC_STRING_FILTER_KEYS.find((k) => k === key);
      if (!match) {
        return;
      }

      const previousValues = filters[match];
      const toggledValue = getToggledFilterValue(previousValues, values);
      const isArgumentSelected = toggledValue ? values.includes(toggledValue) : false;

      setFilters((prev) => ({ ...prev, [match]: values }));

      // Sidebar checkbox toggle for validated arguments only (chip clear / reset are not tracked).
      // argumentSelected: argument display name when checked, false when unchecked.
      if (match === ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION && toggledValue) {
        trackSimpleEvent(MODEL_CATALOG_EVENTS.VALIDATED_ARGUMENTS_FILTER_APPLIED, {
          argumentSelected: isArgumentSelected
            ? LABEL_MAPPINGS[match][toggledValue] || toggledValue
            : false,
        });
      }
    },
    [filters, setFilters, trackSimpleEvent],
  );

  const selectedStringFilters = React.useMemo(() => {
    const result: Record<string, string[] | undefined> = {};
    for (const key of BASIC_STRING_FILTER_KEYS) {
      result[key] = filters[key];
    }
    return result;
  }, [filters]);

  const baseFilterItems = useCatalogFilterConfigs({
    filterKeys: BASIC_STRING_FILTER_KEYS,
    filterNames: MODEL_CATALOG_FILTER_CATEGORY_NAMES,
    filterOptions: filterOptions?.filters,
    selectedFilters: selectedStringFilters,
    onFilterChange,
    labelMappings: LABEL_MAPPINGS,
  });

  const filterPanelItems = React.useMemo((): FilterPanelItem[] => {
    const validatedConfigKey = ModelCatalogStringFilterKey.VALIDATED_CONFIGURATION;
    const items: FilterPanelItem[] = baseFilterItems.map((item) => {
      const itemWithTestIds: StringFilterPanelItem = {
        ...item,
        testIdBase: `${item.title}-filter`,
        getCheckboxTestId: (value: string) => `${item.title}-${value}-checkbox`,
      };
      if (item.key === validatedConfigKey) {
        const hasMultiple = item.filterValues.length > 1;
        const hasSelection = item.selectedValues.length > 0;
        return {
          ...itemWithTestIds,
          footer:
            hasMultiple && hasSelection ? (
              <Content component={ContentVariants.small} className="pf-v6-u-mt-sm">
                Showing models with all selected configurations
              </Content>
            ) : undefined,
        };
      }
      return itemWithTestIds;
    });

    const validatedIndex = items.findIndex((item) => item.key === validatedConfigKey);
    const insertIndex = validatedIndex >= 0 ? validatedIndex + 1 : items.length;

    const sliderItems: FilterPanelItem[] = [
      {
        key: 'hardware-slider-filters',
        title: 'Hardware filters',
        customContent: (
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
            <SidebarSliderFilter
              filterKey={ModelCatalogNumberFilterKey.MIN_VRAM}
              label="Minimum vRAM"
              suffix="GB"
              fallbackMin={4}
              fallbackMax={480}
            />
            <Divider className="pf-v6-u-my-sm" />
            <SidebarSliderFilter
              filterKey={ModelCatalogNumberFilterKey.IMAGE_SIZE}
              label="Container size"
              suffix="GB"
              fallbackMin={4}
              fallbackMax={500}
            />
          </Flex>
        ),
      },
    ];

    items.splice(insertIndex, 0, ...sliderItems);
    return items;
  }, [baseFilterItems]);

  return (
    <CatalogFilterPanel
      loaded={filterOptionsLoaded}
      loadError={filterOptionsLoadError}
      filters={filterPanelItems}
      extraContent={<ModelPerformanceViewToggleCard />}
      testIdPrefix="model-catalog-filter"
    />
  );
};

export default ModelCatalogFilters;
