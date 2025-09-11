import React, { useMemo, useCallback } from 'react';
import { Toolbar, ToolbarContent, ToolbarItem, Switch } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import { extractFilterOptionsFromLineage } from '../screens/lineage/utils';
import {
  MultiSelection,
  type SelectionOptions,
} from '../../../../frontend/src/components/MultiSelection';
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

const FeatureStoreLineageToolbar: React.FC<FeatureStoreLineageToolbarProps> = ({
  hideNodesWithoutRelationships,
  onHideNodesWithoutRelationshipsChange,
  searchFilters = {},
  onSearchFiltersChange,
  lineageData,
  lineageDataLoaded = false,
}) => {
  const availableOptions = useMemo(() => {
    if (!lineageData || !lineageDataLoaded) {
      return {
        entity: [],
        featureView: [],
        dataSource: [],
        featureService: [],
      };
    }
    return extractFilterOptionsFromLineage(lineageData);
  }, [lineageData, lineageDataLoaded]);

  const handleSelectionChange = useCallback(
    (filterType: keyof FeatureStoreLineageSearchFilters, selections: SelectionOptions[]) => {
      if (onSearchFiltersChange) {
        const newFilters = { ...searchFilters };
        const selectedNames = selections.filter((s) => s.selected).map((s) => s.name);
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
    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.entity, searchFilters.entity]);

  const getFeatureViewOptions = useMemo(() => {
    const items = availableOptions.featureView;
    const selectedNames = searchFilters.featureView?.split(', ') || [];
    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.featureView, searchFilters.featureView]);

  const getDataSourceOptions = useMemo(() => {
    const items = availableOptions.dataSource;
    const selectedNames = searchFilters.dataSource?.split(', ') || [];
    return items.map((item) => ({
      ...item,
      selected: selectedNames.includes(item.name),
    }));
  }, [availableOptions.dataSource, searchFilters.dataSource]);

  const getFeatureServiceOptions = useMemo(() => {
    const items = availableOptions.featureService;
    const selectedNames = searchFilters.featureService?.split(', ') || [];
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
      entity: () => (
        <MultiSelection
          value={getEntityOptions}
          setValue={(selections: SelectionOptions[]) => handleSelectionChange('entity', selections)}
          placeholder={lineageDataLoaded ? 'Search entities...' : 'Loading lineage...'}
          ariaLabel="Search entities"
          isDisabled={!lineageDataLoaded}
        />
      ),
      featureView: () => (
        <MultiSelection
          value={getFeatureViewOptions}
          setValue={(selections: SelectionOptions[]) =>
            handleSelectionChange('featureView', selections)
          }
          placeholder={lineageDataLoaded ? 'Search feature views...' : 'Loading lineage...'}
          ariaLabel="Search feature views"
          isDisabled={!lineageDataLoaded}
        />
      ),
      dataSource: () => (
        <MultiSelection
          value={getDataSourceOptions}
          setValue={(selections: SelectionOptions[]) =>
            handleSelectionChange('dataSource', selections)
          }
          placeholder={lineageDataLoaded ? 'Search data sources...' : 'Loading lineage...'}
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
          placeholder={lineageDataLoaded ? 'Search feature services...' : 'Loading lineage...'}
          ariaLabel="Search feature services"
          isDisabled={!lineageDataLoaded}
        />
      ),
    };
    return renderers;
  }, [
    getEntityOptions,
    getFeatureViewOptions,
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

  return (
    <Toolbar style={{ padding: '0.5rem' }} clearAllFilters={onClearAllFilters}>
      <ToolbarContent>
        <ToolbarItem>
          <FilterToolbar
            key="lineage-filters"
            filterOptions={FILTER_OPTIONS}
            filterOptionRenders={filterOptionRenders}
            filterData={{
              entity: searchFilters.entity,
              featureView: searchFilters.featureView,
              dataSource: searchFilters.dataSource,
              featureService: searchFilters.featureService,
            }}
            onFilterUpdate={onFilterUpdate}
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
