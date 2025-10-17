import * as React from 'react';
import { Tr, Td, TableVariant } from '@patternfly/react-table';
import { TextInput, Switch, Flex, FlexItem } from '@patternfly/react-core';
import { FeatureStoreTimestamp } from '#~/pages/projects/featureStoreConfig/FeatureStoreIntegrationComponents';
import { Table, useCheckboxTable, CheckboxTd } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import FilterToolbar from '#~/components/FilterToolbar';
import DashboardDatePicker from '#~/components/DashboardDatePicker';
import { FeatureStoreClientConfig, FilterOptions, FilterData } from './types';
import { getRepositoryInfo, filterConfigs, getConfigId } from './utils';
import { featureStoreColumns, filterOptions, TEST_IDS, initialFilterData } from './const';

const filterOptionRenders = {
  [FilterOptions.NAME]: ({
    onChange,
    ...props
  }: {
    onChange: (value: string) => void;
    value?: string;
  }) => (
    <TextInput
      {...props}
      data-testid={TEST_IDS.NAME_FILTER}
      aria-label="Filter by name"
      placeholder="Search by name..."
      onChange={(_event, value) => onChange(value)}
    />
  ),
  [FilterOptions.PROJECT]: ({
    onChange,
    ...props
  }: {
    onChange: (value: string) => void;
    value?: string;
  }) => (
    <TextInput
      {...props}
      data-testid={TEST_IDS.PROJECT_FILTER}
      aria-label="Filter by associated feature store repository"
      placeholder="Search by associated feature store repository..."
      onChange={(_event, value) => onChange(value)}
    />
  ),
  [FilterOptions.CREATED]: ({
    onChange,
    ...props
  }: {
    onChange: (value: string) => void;
    value?: string;
  }) => (
    <DashboardDatePicker
      {...props}
      hideError
      data-testid={TEST_IDS.CREATED_FILTER}
      aria-label="Select a start date"
      placeholder="MM/DD/YYYY"
      onChange={(_, value, date) => {
        if (date || !value) {
          onChange(value);
        }
      }}
    />
  ),
};

interface FeatureStoreTableRowProps {
  config: FeatureStoreClientConfig;
  checkboxProps: Omit<React.ComponentProps<typeof CheckboxTd>, 'id'>;
}

const FeatureStoreTableRow: React.FC<FeatureStoreTableRowProps> = ({ config, checkboxProps }) => {
  const createdDate = config.configMap.metadata.creationTimestamp
    ? new Date(config.configMap.metadata.creationTimestamp)
    : null;

  const hasAccess = config.hasAccessToFeatureStore === true;
  const isDisabled = !hasAccess;
  const configId = getConfigId(config);

  return (
    <Tr isRowSelected={checkboxProps.isChecked === true}>
      <CheckboxTd
        id={configId}
        {...checkboxProps}
        isDisabled={isDisabled}
        tooltip={
          isDisabled ? 'Contact your admin to request permission to use this configmap.' : undefined
        }
      />
      <Td dataLabel="Name">{config.configName}</Td>
      <Td dataLabel="Associated Feature Store Repository">{getRepositoryInfo(config.configMap)}</Td>
      <Td dataLabel="Created">
        {createdDate ? <FeatureStoreTimestamp date={createdDate} fallback="Unknown" /> : '-'}
      </Td>
    </Tr>
  );
};

interface FeatureStoreTableProps {
  configs: FeatureStoreClientConfig[];
  loading?: boolean;
  onSelectionChange?: (selectedConfigs: FeatureStoreClientConfig[]) => void;
}

const FeatureStoreTable: React.FC<FeatureStoreTableProps> = ({
  configs,
  loading = false,
  onSelectionChange,
}) => {
  const [filterData, setFilterData] = React.useState<FilterData>(initialFilterData);
  const [showOnlyAccessible, setShowOnlyAccessible] = React.useState(false);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) => {
      const stringValue = typeof value === 'string' ? value : value?.value || '';
      setFilterData((prevValues) => ({ ...prevValues, [key]: stringValue }));
    },
    [],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterData(initialFilterData);
  }, []);

  const filteredConfigs = React.useMemo(() => {
    let filtered = filterConfigs(configs, filterData);

    if (showOnlyAccessible) {
      filtered = filtered.filter((config) => config.hasAccessToFeatureStore === true);
    }

    return filtered;
  }, [configs, filterData, showOnlyAccessible]);

  const selectableConfigIds = filteredConfigs
    .filter((config) => config.hasAccessToFeatureStore === true)
    .map((config) => getConfigId(config));

  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCheckboxTable(selectableConfigIds);

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedConfigs = filteredConfigs.filter(
        (config) =>
          selections.includes(getConfigId(config)) && config.hasAccessToFeatureStore === true,
      );
      onSelectionChange(selectedConfigs);
    }
  }, [selections, filteredConfigs, onSelectionChange]);

  const rowRenderer = React.useCallback(
    (config: FeatureStoreClientConfig) => {
      const configId = getConfigId(config);
      const isConfigSelected = isSelected(configId);
      const hasAccess = config.hasAccessToFeatureStore === true;

      return (
        <FeatureStoreTableRow
          key={configId}
          config={config}
          checkboxProps={{
            isChecked: isConfigSelected,
            onToggle: () => {
              if (hasAccess) {
                toggleSelection(configId);
              }
            },
          }}
        />
      );
    },
    [isSelected, toggleSelection],
  );

  return (
    <Table
      {...checkboxTableProps}
      data={filteredConfigs}
      columns={featureStoreColumns}
      loading={loading}
      enablePagination="compact"
      variant={TableVariant.compact}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
          style={{ marginInline: '0' }}
        >
          <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 0 }}>
            <FilterToolbar
              filterOptions={filterOptions}
              filterOptionRenders={filterOptionRenders}
              filterData={filterData}
              onFilterUpdate={onFilterUpdate}
              testId={TEST_IDS.FEATURE_STORE_FILTER}
            />
          </FlexItem>
          <FlexItem flex={{ default: 'flexNone' }}>
            <Flex
              gap={{ default: 'gapSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
              flexWrap={{ default: 'nowrap' }}
            >
              <Switch
                id="show-only-accessible-toggle"
                label="Show only accessible"
                isChecked={showOnlyAccessible}
                onChange={(_event, checked) => setShowOnlyAccessible(checked)}
                data-testid={TEST_IDS.SHOW_ONLY_ACCESSIBLE_TOGGLE}
              />
            </Flex>
          </FlexItem>
        </Flex>
      }
      rowRenderer={rowRenderer}
      data-testid={TEST_IDS.FEATURE_STORE_TABLE}
    />
  );
};

export default FeatureStoreTable;
