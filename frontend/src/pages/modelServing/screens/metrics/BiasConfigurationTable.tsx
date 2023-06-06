import * as React from 'react';
import { Button, ToolbarItem } from '@patternfly/react-core';
import Table from '~/components/table/Table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { InferenceServiceKind } from '~/k8sTypes';
import DeleteBiasConfigurationModal from '~/pages/modelServing/screens/metrics/biasConfigurationModal/DeleteBiasConfigurationModal';
import ManageBiasConfigurationModal from './biasConfigurationModal/ManageBiasConfigurationModal';
import BiasConfigurationTableRow from './BiasConfigurationTableRow';
import { columns } from './tableData';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';
import BiasConfigurationButton from './BiasConfigurationButton';

type BiasConfigurationTableProps = {
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationTable: React.FC<BiasConfigurationTableProps> = ({ inferenceService }) => {
  const { biasMetricConfigs, refresh } = useExplainabilityModelData();
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const [cloneConfiguration, setCloneConfiguration] = React.useState<BiasMetricConfig>();
  const [deleteConfiguration, setDeleteConfiguration] = React.useState<BiasMetricConfig>();

  const filteredConfigurations = biasMetricConfigs.filter((configuration) => {
    if (!search) {
      return true;
    }

    // TODO: add more search types
    switch (searchType) {
      case SearchType.NAME:
        return configuration.name.toLowerCase().includes(search.toLowerCase());
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
    () =>
      Object.keys(SearchType).filter(
        (key) =>
          SearchType[key] === SearchType.NAME ||
          SearchType[key] === SearchType.PROTECTED_ATTRIBUTE ||
          SearchType[key] === SearchType.OUTPUT,
      ),
    [],
  );
  return (
    <>
      <Table
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
        emptyTableView={
          search ? (
            <>
              No metric configurations match your filters.{' '}
              <Button variant="link" isInline onClick={resetFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <BiasConfigurationEmptyState />
          )
        }
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(searchType) => {
                  setSearchType(searchType);
                }}
                onSearchValueChange={(searchValue) => {
                  setSearch(searchValue);
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <BiasConfigurationButton inferenceService={inferenceService} />
            </ToolbarItem>
          </>
        }
      />
      <ManageBiasConfigurationModal
        existingConfiguration={cloneConfiguration}
        isOpen={!!cloneConfiguration}
        onClose={(submit) => {
          if (submit) {
            refresh();
          }
          setCloneConfiguration(undefined);
        }}
        inferenceService={inferenceService}
      />
      <DeleteBiasConfigurationModal
        configurationToDelete={deleteConfiguration}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteConfiguration(undefined);
        }}
      />
    </>
  );
};

export default BiasConfigurationTable;
