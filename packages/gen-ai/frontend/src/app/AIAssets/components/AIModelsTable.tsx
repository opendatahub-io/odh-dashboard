import * as React from 'react';
import { Button, ButtonVariant, Popover, Content, Stack, StackItem } from '@patternfly/react-core';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import { aiModelColumns } from '~/app/AIAssets/data/columns';
import useAIModelsFilter from '~/app/AIAssets/hooks/useAIModelsFilter';
import {
  AssetsFilterColors,
  AssetsFilterOptions,
  assetsFilterOptions,
} from '~/app/AIAssets/data/filterOptions';
import AIModelTableRow from './AIModelTableRow';
import ModelsListToolbar from './ModelsListToolbar';

type AIModelsTableProps = {
  models: AIModel[];
  playgroundModels: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
};

export const AIModelStatusPopoverContent: React.ReactNode = (
  <Stack hasGutter>
    <StackItem>
      <Content component="p">
        This page displays only model deployments that are available as AI assets.
      </Content>
      <Content component="p">
        To make a deployment available as an AI asset, edit it from the{' '}
        <strong>Model deployments</strong> page.
      </Content>
    </StackItem>
  </Stack>
);

export const AIModelStatusPopover: React.ReactNode = (
  <Popover
    position="bottom"
    showClose
    aria-label="Information about making model deployments available"
    headerComponent="h2"
    bodyContent={AIModelStatusPopoverContent}
  >
    <Button variant={ButtonVariant.link} data-testid="dont-see-model-button">
      Don&apos;t see the model you&apos;re looking for?
    </Button>
  </Popover>
);

const AIModelsTable: React.FC<AIModelsTableProps> = ({ models, playgroundModels, lsdStatus }) => {
  const { filterData, onFilterUpdate, onClearFilters, filteredModels } = useAIModelsFilter(models);

  const aiFilterColors = {
    [AssetsFilterOptions.NAME]: AssetsFilterColors.NAME,
    [AssetsFilterOptions.KEYWORD]: AssetsFilterColors.KEYWORD,
    [AssetsFilterOptions.USE_CASE]: AssetsFilterColors.USE_CASE,
  };

  return (
    <Table
      data-testid="ai-models-table"
      data={filteredModels}
      columns={aiModelColumns}
      disableRowRenderSupport
      enablePagination
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={
        <ModelsListToolbar
          onFilterUpdate={onFilterUpdate}
          filterData={filterData}
          filterOptions={assetsFilterOptions}
          filterColors={aiFilterColors}
          infoPopover={AIModelStatusPopover}
          onClearFilters={onClearFilters}
        />
      }
      onClearFilters={onClearFilters}
      rowRenderer={(model) => (
        <AIModelTableRow
          lsdStatus={lsdStatus}
          key={model.model_name}
          model={model}
          models={models}
          playgroundModels={playgroundModels}
        />
      )}
    />
  );
};

export default AIModelsTable;
