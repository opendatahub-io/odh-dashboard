import { dataSourceTableFilterKeyMapping } from './const';
import { DataSource } from '../../types/dataSources';
import { FeatureStoreRelationship } from '../../types/global';
import { createFeatureStoreFilterUtils } from '../../utils/filterUtils';

const dataSourceFilterUtils = createFeatureStoreFilterUtils<DataSource, FeatureStoreRelationship>(
  dataSourceTableFilterKeyMapping,
  'name', // namePath - DataSource has name at root level
  undefined,
);

export const applyDataSourceFilters = (
  dataSources: DataSource[],
  relationships: Record<string, FeatureStoreRelationship[]>,
  filterData: Record<string, string | { label: string; value: string } | undefined>,
): DataSource[] => {
  const { type: typeFilter, ...otherFilters } = filterData;

  let filtered = dataSourceFilterUtils.applyFilters(dataSources, relationships, otherFilters);

  if (typeFilter && typeof typeFilter === 'string') {
    const filterValue = typeFilter.toLowerCase();

    const labelToTypeMap: Record<string, string[]> = {
      'file source': ['BATCH_FILE'],
      'request source': ['REQUEST_SOURCE'],
      'stream kafka': ['STREAM_KAFKA'],
      'push source': ['PUSH_SOURCE'],
    };

    const matchingTypes: string[] = [];
    Object.entries(labelToTypeMap).forEach(([label, types]) => {
      if (label.includes(filterValue) || filterValue.includes(label)) {
        matchingTypes.push(...types);
      }
    });

    if (matchingTypes.length > 0) {
      filtered = filtered.filter((dataSource) => matchingTypes.includes(dataSource.type));
    } else {
      filtered = filtered.filter((dataSource) => {
        const connectorType = getDataSourceConnectorType(dataSource.type);
        return connectorType.toLowerCase().includes(filterValue);
      });
    }
  }

  return filtered;
};

export const getDataSourceConnectorType = (type: DataSource['type']): string => {
  switch (type) {
    case 'BATCH_FILE':
      return 'File source';
    case 'REQUEST_SOURCE':
      return 'Request source';
    case 'STREAM_KAFKA':
      return 'Stream Kafka';
    case 'PUSH_SOURCE':
      return 'Push source';
    default:
      return 'Unknown';
  }
};
