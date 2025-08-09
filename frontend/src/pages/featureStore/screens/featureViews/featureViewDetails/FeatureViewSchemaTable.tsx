import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router';
import { Table } from '#~/components/table';
import {
  schemaColumns,
  schemaFilterOptions,
} from '#~/pages/featureStore/screens/featureViews/const';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import { FeatureStoreToolbar } from '#~/pages/featureStore/components/FeatureStoreToolbar';
import {
  getSchemaItemValue,
  getSchemaItemLink,
} from '#~/pages/featureStore/screens/featureViews/utils';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';

export type SchemaItem = {
  column: string;
  type: string;
  dataType: string;
  description: string;
};

type FeatureViewSchemaTableProps = {
  featureView: FeatureView;
};

const SchemaTableRow: React.FC<{
  item: SchemaItem;
  index: number;
  featureView: FeatureView;
}> = ({ item, index, featureView }) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <Tr key={`${item.column}-${index}`}>
      <Td dataLabel="Column">
        <Link to={getSchemaItemLink(item, featureView, currentProject)}>{item.column}</Link>
      </Td>
      <Td dataLabel="Type">{item.type}</Td>
      <Td dataLabel="Data Type">{item.dataType}</Td>
      <Td dataLabel="Description">{item.description}</Td>
    </Tr>
  );
};

const FeatureViewSchemaTable: React.FC<FeatureViewSchemaTableProps> = ({ featureView }) => {
  const [filterData, setFilterData] = React.useState<
    Record<string, string | { label: string; value: string } | undefined>
  >({});

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({
        ...prevValues,
        [key]: typeof value === 'string' ? value : value?.value,
      })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData({}), []);

  const schemaData = React.useMemo(
    () => [
      ...featureView.spec.entityColumns.map((entity) => ({
        column: entity.name,
        type: 'Entity'.toUpperCase(),
        dataType: entity.valueType,
        description: entity.description || '-',
      })),
      ...featureView.spec.features.map((feature) => ({
        column: feature.name,
        type: 'Feature'.toUpperCase(),
        dataType: feature.valueType,
        description: feature.description || '-',
      })),
    ],
    [featureView.spec.entityColumns, featureView.spec.features],
  );

  const filteredSchemaData = React.useMemo(
    () =>
      schemaData.filter((item) =>
        Object.entries(filterData).every(([key, filterValue]) => {
          if (!filterValue) {
            return true;
          }

          const filterString = typeof filterValue === 'string' ? filterValue : filterValue.value;
          const itemValue = getSchemaItemValue(item, key);

          return itemValue.toLowerCase().includes(filterString.toLowerCase());
        }),
      ),
    [schemaData, filterData],
  );

  return (
    <Table
      data-testid="feature-view-schema-table"
      id="feature-view-schema-table"
      enablePagination
      data={filteredSchemaData}
      columns={schemaColumns}
      emptyTableView={<div>No schema data available</div>}
      rowRenderer={(item, index) => (
        <SchemaTableRow item={item} index={index} featureView={featureView} />
      )}
      toolbarContent={
        <FeatureStoreToolbar
          filterOptions={schemaFilterOptions}
          filterData={filterData}
          onFilterUpdate={onFilterUpdate}
        />
      }
      onClearFilters={onClearFilters}
      variant="compact"
    />
  );
};

export default FeatureViewSchemaTable;
