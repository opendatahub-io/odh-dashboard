import React from 'react';
import FeatureStoreDataSourcesTable from './FeatureStoreDataSourceTable';
import { FeatureStoreToolbar } from '../../../components/FeatureStoreToolbar';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { DataSourceList } from '../../../types/dataSources';
import { applyDataSourceFilters, getDataSourceConnectorType } from '../utils';
import { dataSourceTableFilterOptions } from '../const';

const FeatureStoreDataSourceListView = ({
  dataSources,
}: {
  dataSources: DataSourceList;
}): React.ReactElement => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});
  const { currentProject } = useFeatureStoreProject();

  const processedDataSources = React.useMemo(() => {
    if (currentProject) {
      return dataSources.dataSources.map((dataSource) => ({
        ...dataSource,
        project: dataSource.project || currentProject,
      }));
    }
    return dataSources.dataSources;
  }, [dataSources.dataSources, currentProject]);

  const dynamicFilterOptions = React.useMemo(() => {
    const connectorTypes = new Set<string>();
    processedDataSources.forEach((dataSource) => {
      const connectorType = getDataSourceConnectorType(dataSource.type);
      connectorTypes.add(connectorType);
    });

    const dynamicOptions = { ...dataSourceTableFilterOptions };

    if (connectorTypes.size > 0) {
      dynamicOptions.type = 'Data source connector';
    }

    return dynamicOptions;
  }, [processedDataSources]);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterData({});
  }, []);

  const filteredDataSources = React.useMemo(() => {
    let filtered = processedDataSources;
    filtered = applyDataSourceFilters(filtered, dataSources.relationships || {}, filterData);

    return filtered;
  }, [processedDataSources, dataSources.relationships, filterData]);

  return (
    <FeatureStoreDataSourcesTable
      dataSources={filteredDataSources}
      relationships={dataSources.relationships || {}}
      onClearFilters={onClearFilters}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={dynamicFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
        />
      }
    />
  );
};

export default FeatureStoreDataSourceListView;
