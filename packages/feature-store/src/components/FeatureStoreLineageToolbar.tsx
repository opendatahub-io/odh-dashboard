import React, { useMemo, useCallback } from 'react';
import { Toolbar, ToolbarContent, ToolbarItem, Switch } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import {
  MultiSelection,
  type SelectionOptions,
} from '@odh-dashboard/internal/components/MultiSelection';
import {
  extractFilterOptionsFromLineage,
  extractFilterOptionsFromFeatureViewLineage,
} from '../screens/lineage/utils';
import {
  FeatureStoreLineageToolbarProps,
  FeatureStoreLineageSearchFilters,
} from '../types/toolbarTypes';

type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

const FILTER_OPTIONS = {
  entity: 'Entity',
  featureView: 'Feature View',
  dataSource: 'Data Source',
  featureService: 'Feature Service',
};

const FILTER_TOOLBAR_INNER_FILTER_CLASS = 'filter-toolbar-inner-filter';

const FeatureStoreLineageToolbar: React.FC<FeatureStoreLineageToolbarProps> = ({
  hideNodesWithoutRelationships,
  onHideNodesWithoutRelationshipsChange,
  searchFilters = {},
  onSearchFiltersChange,
  currentFilterType = 'entity',
  onCurrentFilterTypeChange,
  lineageData,
  lineageDataLoaded = false,
  isFeatureViewToolbar = false,
}) => {
  React.useEffect(() => {
    const hasFilters = Object.values(searchFilters).some(
      (filter) => filter && filter.trim() !== '',
    );

    if (hasFilters) {
      const addClassToSecondElement = () => {
        const toolbarContents = document.querySelectorAll(
          '.fs-toolbar-content .pf-v6-c-toolbar__content',
        );
        if (toolbarContents.length >= 2) {
          const secondContent = toolbarContents[1];
          if (!secondContent.classList.contains(FILTER_TOOLBAR_INNER_FILTER_CLASS)) {
            secondContent.classList.add(FILTER_TOOLBAR_INNER_FILTER_CLASS);
          }
        }
      };
      requestAnimationFrame(addClassToSecondElement);
    } else {
      const toolbarContents = document.querySelectorAll(
        '.fs-toolbar-content .pf-v6-c-toolbar__content',
      );
      if (toolbarContents.length >= 2) {
        toolbarContents[1].classList.remove(FILTER_TOOLBAR_INNER_FILTER_CLASS);
      }
    }
  }, [searchFilters]);

  const availableOptions = useMemo(() => {
    if (!lineageData || !lineageDataLoaded) {
      return {
        entity: [],
        featureView: [],
        dataSource: [],
        featureService: [],
      };
    }

    if (isFeatureViewToolbar) {
      return extractFilterOptionsFromFeatureViewLineage(lineageData);
    }

    return extractFilterOptionsFromLineage(lineageData);
  }, [lineageData, lineageDataLoaded, isFeatureViewToolbar]);

  const handleSelectionChange = useCallback(
    (filterType: keyof FeatureStoreLineageSearchFilters, selections: SelectionOptions[]) => {
      if (onSearchFiltersChange) {
        const newFilters = { ...searchFilters };
        const selectedNames = selections
          .filter((s) => s.selected && !s.isAriaDisabled)
          .map((s) => s.name);
        if (selectedNames.length > 0) {
          newFilters[filterType] = selectedNames.join(', ');
        } else {
          delete newFilters[filterType];
        }
        onSearchFiltersChange(newFilters);
      }
    },
    [onSearchFiltersChange, searchFilters],
  );

  const getEntityOptions = useMemo(() => {
    const items = availableOptions.entity;
    const selectedNames = searchFilters.entity?.split(', ') || [];

    if (items.length === 0) {
      return [
        {
          id: 'no-entities',
          name: 'No entities available',
          selected: false,
          isAriaDisabled: true,
        },
      ];
    }

    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.entity, searchFilters.entity]);

  const getFeatureViewOptions = useMemo(() => {
    const items = availableOptions.featureView;
    const selectedNames = searchFilters.featureView?.split(', ') || [];

    if (items.length === 0) {
      return [
        {
          id: 'no-feature-views',
          name: 'No feature views available',
          selected: false,
          isAriaDisabled: true,
        },
      ];
    }

    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.featureView, searchFilters.featureView]);

  const getDataSourceOptions = useMemo(() => {
    const items = availableOptions.dataSource;
    const selectedNames = searchFilters.dataSource?.split(', ') || [];

    if (items.length === 0) {
      return [
        {
          id: 'no-data-sources',
          name: 'No data sources available',
          selected: false,
          isAriaDisabled: true,
        },
      ];
    }

    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.dataSource, searchFilters.dataSource]);

  const getFeatureServiceOptions = useMemo(() => {
    const items = availableOptions.featureService;
    const selectedNames = searchFilters.featureService?.split(', ') || [];

    if (items.length === 0) {
      return [
        {
          id: 'no-feature-services',
          name: 'No feature services available',
          selected: false,
          isAriaDisabled: true,
        },
      ];
    }

    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.featureService, searchFilters.featureService]);

  const filterOptionRenders = useMemo(() => {
    const renderers: Record<
      keyof FeatureStoreLineageSearchFilters,
      (props: FilterOptionRenders) => React.ReactNode
    > = {
      featureView: () => (
        <MultiSelection
          value={getFeatureViewOptions}
          setValue={(selections: SelectionOptions[]) =>
            handleSelectionChange('featureView', selections)
          }
          placeholder={!lineageDataLoaded ? 'Loading lineage...' : 'Search feature views...'}
          ariaLabel="Search feature views"
          isDisabled={!lineageDataLoaded}
        />
      ),
      entity: () => (
        <MultiSelection
          value={getEntityOptions}
          setValue={(selections: SelectionOptions[]) => handleSelectionChange('entity', selections)}
          placeholder={!lineageDataLoaded ? 'Loading lineage...' : 'Search entities...'}
          ariaLabel="Search entities"
          isDisabled={!lineageDataLoaded}
        />
      ),
      dataSource: () => (
        <MultiSelection
          value={getDataSourceOptions}
          setValue={(selections: SelectionOptions[]) =>
            handleSelectionChange('dataSource', selections)
          }
          placeholder={!lineageDataLoaded ? 'Loading lineage...' : 'Search data sources...'}
          ariaLabel="Search data sources"
          isDisabled={!lineageDataLoaded}
        />
      ),
      featureService: () => (
        <MultiSelection
          value={getFeatureServiceOptions}
          setValue={(selections: SelectionOptions[]) =>
            handleSelectionChange('featureService', selections)
          }
          placeholder={!lineageDataLoaded ? 'Loading lineage...' : 'Search feature services...'}
          ariaLabel="Search feature services"
          isDisabled={!lineageDataLoaded}
        />
      ),
    };
    return renderers;
  }, [
    getFeatureViewOptions,
    getEntityOptions,
    getDataSourceOptions,
    getFeatureServiceOptions,
    handleSelectionChange,
    lineageDataLoaded,
  ]);

  const onFilterUpdate = useCallback(
    (
      filterType: keyof FeatureStoreLineageSearchFilters,
      value?: string | { label: string; value: string },
    ) => {
      if (onSearchFiltersChange) {
        const newFilters = { ...searchFilters };
        if (!value || value === '') {
          delete newFilters[filterType];
        } else {
          const filterValue = typeof value === 'string' ? value : value.value;
          newFilters[filterType] = filterValue;
        }
        onSearchFiltersChange(newFilters);
      }
    },
    [onSearchFiltersChange, searchFilters],
  );

  const onClearAllFilters = useCallback(() => {
    if (onSearchFiltersChange) {
      onSearchFiltersChange({});
    }
  }, [onSearchFiltersChange]);

  // Memoize filterData to prevent FilterToolbar from remounting
  const filterData = useMemo(
    () => ({
      entity: searchFilters.entity,
      featureView: searchFilters.featureView,
      dataSource: searchFilters.dataSource,
      featureService: searchFilters.featureService,
    }),
    [
      searchFilters.entity,
      searchFilters.featureView,
      searchFilters.dataSource,
      searchFilters.featureService,
    ],
  );

  return (
    <Toolbar
      className="fs-toolbar-content"
      style={{
        padding: '1rem 1rem 0.2rem',
        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
        position: 'relative',
      }}
      clearAllFilters={onClearAllFilters}
    >
      <style>
        {`.${FILTER_TOOLBAR_INNER_FILTER_CLASS} {
           position: absolute;
           top: 4rem;
           left: 16px;
           right: 0;
           bottom: 0;
           z-index: 2;
           width: fit-content;
           row-gap: 0.5rem;
         }
         
         #tabContent-Lineage .pf-topology-visualization-surface__svg{
           z-index: 1;
         }
        #tabContent-Lineage .pf-topology-control-bar {
          z-index:2 ;
        }
         `}
      </style>
      <ToolbarContent>
        <ToolbarItem>
          <FilterToolbar
            key="lineage-filters"
            filterOptions={FILTER_OPTIONS}
            filterOptionRenders={filterOptionRenders}
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
            currentFilterType={currentFilterType}
            onFilterTypeChange={onCurrentFilterTypeChange}
            testId="lineage-search-filter"
          />
        </ToolbarItem>
        <ToolbarItem alignSelf="center">
          <Switch
            id="hide-nodes-without-relationships"
            label="Hide nodes without relationships"
            isChecked={hideNodesWithoutRelationships}
            onChange={(_event, checked) => onHideNodesWithoutRelationshipsChange(checked)}
            aria-label="Toggle visibility of nodes without relationships"
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default FeatureStoreLineageToolbar;
