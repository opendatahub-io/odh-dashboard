import * as React from 'react';
import { Button, ButtonVariant, ToolbarItem } from '@patternfly/react-core';
import DashboardSearchField, { SearchType } from '#~/concepts/dashboard/DashboardSearchField';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { useModelBiasData } from '#~/concepts/trustyai/context/useModelBiasData';
import { InferenceServiceKind } from '#~/k8sTypes';
import DeleteBiasConfigurationModal from '#~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationModal/DeleteBiasConfigurationModal';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { Table } from '#~/components/table';
import ManageBiasConfigurationModal from '#~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationModal/ManageBiasConfigurationModal';
import BiasConfigurationTableRow from './BiasConfigurationTableRow';
import { columns } from './tableData';

type BiasConfigurationTableProps = {
  inferenceService: InferenceServiceKind;
  onConfigure: () => void;
};

const BiasConfigurationTable: React.FC<BiasConfigurationTableProps> = ({
  inferenceService,
  onConfigure,
}) => {
  const { biasMetricConfigs, refresh } = useModelBiasData();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const [cloneConfiguration, setCloneConfiguration] = React.useState<BiasMetricConfig>();
  const [deleteConfiguration, setDeleteConfiguration] = React.useState<BiasMetricConfig>();

  const filteredConfigurations = biasMetricConfigs.filter((configuration) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.NAME:
        return configuration.name.toLowerCase().includes(search.toLowerCase());
      case SearchType.METRIC:
        return configuration.metricType.toLowerCase().includes(search.toLocaleLowerCase());
      case SearchType.PROTECTED_ATTRIBUTE:
        return configuration.protectedAttribute.toLowerCase().includes(search.toLowerCase());
      case SearchType.OUTPUT:
        return configuration.outcomeName.toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  // TODO: decide what we want to search
  // Or should we reuse the complex filter search
  const searchTypes = React.useMemo(
    () => [SearchType.NAME, SearchType.METRIC, SearchType.PROTECTED_ATTRIBUTE, SearchType.OUTPUT],
    [],
  );
  return (
    <>
      <Table
        data-testid="metrics-configure-table-loaded"
        data={filteredConfigurations}
        columns={columns}
        defaultSortColumn={1}
        disableRowRenderSupport
        rowRenderer={(configuration, i) => (
          <BiasConfigurationTableRow
            key={configuration.id}
            obj={configuration}
            rowIndex={i}
            onCloneConfiguration={setCloneConfiguration}
            onDeleteConfiguration={setDeleteConfiguration}
          />
        )}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(newSearchType) => {
                  setSearchType(newSearchType);
                }}
                onSearchValueChange={(searchValue) => {
                  setSearch(searchValue);
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Button onClick={onConfigure} variant={ButtonVariant.secondary}>
                Configure metric
              </Button>
            </ToolbarItem>
          </>
        }
      />
      {cloneConfiguration ? (
        <ManageBiasConfigurationModal
          existingConfiguration={cloneConfiguration}
          onClose={(submit) => {
            if (submit) {
              refresh();
            }
            setCloneConfiguration(undefined);
          }}
          inferenceService={inferenceService}
        />
      ) : null}
      {deleteConfiguration ? (
        <DeleteBiasConfigurationModal
          configurationToDelete={deleteConfiguration}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteConfiguration(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default BiasConfigurationTable;
