import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  Label,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
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
  toolbarActions?: React.ReactNode;
};

const dontSeeModelPopoverContent: React.ReactNode = (
  <Stack hasGutter>
    <StackItem>
      <Content component="p">
        This page displays model deployments available as AI assets and MaaS models.
      </Content>
      <Content component="p">
        To make a deployment available as an AI asset, edit it from the{' '}
        <strong>Model deployments</strong> page. MaaS models are managed by your administrator.
      </Content>
    </StackItem>
  </Stack>
);

export const AIModelStatusPopover: React.FC<{ modelsVisibleCount: number }> = ({
  modelsVisibleCount,
}) => (
  <Popover
    position="bottom"
    showClose
    aria-label="Information about making model deployments available"
    headerComponent="h2"
    bodyContent={dontSeeModelPopoverContent}
  >
    <Button
      variant={ButtonVariant.link}
      data-testid="dont-see-model-button"
      onClick={() => {
        fireMiscTrackingEvent('Available Endpoints Model Not Found Clicked', {
          modelsVisibleCount,
        });
      }}
    >
      Don&apos;t see the model you&apos;re looking for?
    </Button>
  </Popover>
);

export const AIModelStatusPopoverContent = (
  <Stack hasGutter>
    <StackItem>
      <Content component={ContentVariants.dl}>
        <Content component={ContentVariants.dt}>
          <Label color="green" icon={<CheckCircleIcon />} isCompact>
            Active
          </Label>
        </Content>
        <Content component={ContentVariants.dd}>
          The model endpoint is running and ready to serve requests.
        </Content>
        <Content component={ContentVariants.dt}>
          <Label color="red" icon={<ExclamationCircleIcon />} isCompact>
            Inactive
          </Label>
        </Content>
        <Content component={ContentVariants.dd}>
          The model endpoint is not currently available.
        </Content>
      </Content>
    </StackItem>
  </Stack>
);

const AI_FILTER_COLORS: Record<string, AssetsFilterColors> = {
  [AssetsFilterOptions.NAME]: AssetsFilterColors.NAME,
  [AssetsFilterOptions.SOURCE]: AssetsFilterColors.SOURCE,
  [AssetsFilterOptions.USE_CASE]: AssetsFilterColors.USE_CASE,
  [AssetsFilterOptions.STATUS]: AssetsFilterColors.STATUS,
  [AssetsFilterOptions.MODEL_TYPE]: AssetsFilterColors.MODEL_TYPE,
};

const AIModelsTable: React.FC<AIModelsTableProps> = ({
  models,
  playgroundModels,
  lsdStatus,
  toolbarActions,
}) => {
  const { filterData, onFilterUpdate, onClearFilters, filteredModels } = useAIModelsFilter(models);

  return (
    <Table
      variant="compact"
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
          filterColors={AI_FILTER_COLORS}
          infoPopover={<AIModelStatusPopover modelsVisibleCount={filteredModels.length} />}
          onClearFilters={onClearFilters}
          resultsCount={filteredModels.length}
          toolbarActions={toolbarActions}
        />
      }
      onClearFilters={onClearFilters}
      rowRenderer={(model) => (
        <AIModelTableRow
          lsdStatus={lsdStatus}
          key={`${model.modelSource || 'namespace'}-${model.model_id}`}
          model={model}
          allModels={models}
          playgroundModels={playgroundModels}
        />
      )}
    />
  );
};

export default AIModelsTable;
