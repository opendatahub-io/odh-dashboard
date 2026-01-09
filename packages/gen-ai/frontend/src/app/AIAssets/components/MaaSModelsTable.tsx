import * as React from 'react';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { AIModel, LlamaModel, LlamaStackDistributionModel, MaaSModel } from '~/app/types';
import { maasModelColumns } from '~/app/AIAssets/data/maasColumns';
import useMaaSModelsFilter from '~/app/AIAssets/hooks/useMaaSModelsFilter';
import {
  AssetsFilterColors,
  AssetsFilterOptions,
  assetsFilterOptions,
} from '~/app/AIAssets/data/filterOptions';
import MaaSModelTableRow from './MaaSModelTableRow';
import ModelsListToolbar from './ModelsListToolbar';
import TierInfoPopover from './TierInfoPopover';

type MaaSModelsTableProps = {
  maasModels: MaaSModel[];
  playgroundModels: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
  aiModels: AIModel[];
};

const MaaSModelsTable: React.FC<MaaSModelsTableProps> = ({
  maasModels,
  playgroundModels,
  lsdStatus,
  aiModels,
}) => {
  const { filterData, onFilterUpdate, onClearFilters, filteredModels } =
    useMaaSModelsFilter(maasModels);

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
          infoPopover={<TierInfoPopover />}
          onClearFilters={onClearFilters}
        />
      }
      onClearFilters={onClearFilters}
      rowRenderer={(model) => (
        <MaaSModelTableRow
          key={model.id}
          model={model}
          playgroundModels={playgroundModels}
          lsdStatus={lsdStatus}
          aiModels={aiModels}
          maasModels={maasModels}
        />
      )}
    />
  );
};

export default MaaSModelsTable;
