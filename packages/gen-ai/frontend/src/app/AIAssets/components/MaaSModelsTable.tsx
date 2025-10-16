import * as React from 'react';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { MaaSModel } from '~/app/types';
import { maasModelColumns } from '~/app/AIAssets/data/maasColumns';
import useMaaSModelsFilter from '~/app/AIAssets/hooks/useMaaSModelsFilter';
import {
  AssetsFilterColors,
  AssetsFilterOptions,
  assetsFilterOptions,
} from '~/app/AIAssets/data/filterOptions';
import MaaSModelTableRow from './MaaSModelTableRow';
import ModelsListToolbar from './ModelsListToolbar';

type MaaSModelsTableProps = {
  models: MaaSModel[];
  namespace: string;
};

const MaaSModelsTable: React.FC<MaaSModelsTableProps> = ({ models, namespace }) => {
  const { filterData, onFilterUpdate, onClearFilters, filteredModels } =
    useMaaSModelsFilter(models);

  const maasFilterColors = {
    [AssetsFilterOptions.NAME]: AssetsFilterColors.NAME,
    [AssetsFilterOptions.KEYWORD]: AssetsFilterColors.KEYWORD,
  };

  const maasFilterOptions = {
    [AssetsFilterOptions.NAME]: assetsFilterOptions[AssetsFilterOptions.NAME],
    [AssetsFilterOptions.KEYWORD]: assetsFilterOptions[AssetsFilterOptions.KEYWORD],
  };

  return (
    <Table
      data-testid="maas-models-table"
      data={filteredModels}
      columns={maasModelColumns}
      disableRowRenderSupport
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={
        <ModelsListToolbar
          onFilterUpdate={onFilterUpdate}
          filterData={filterData}
          filterOptions={maasFilterOptions}
          filterColors={maasFilterColors}
          onClearFilters={onClearFilters}
        />
      }
      onClearFilters={onClearFilters}
      rowRenderer={(model) => (
        <MaaSModelTableRow key={model.id} model={model} namespace={namespace} />
      )}
    />
  );
};

export default MaaSModelsTable;
