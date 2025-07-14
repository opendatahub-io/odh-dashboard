import * as React from 'react';
import { EmptyStateVariant } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import PipelineSelectorTableRow from '#~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { TableBase, getTableColumnSort } from '#~/components/table';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';
import { pipelineSelectorColumns } from '#~/concepts/pipelines/content/pipelineSelector/columns';
import PipelineViewMoreFooterRow from '#~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { usePipelineSelector } from '#~/concepts/pipelines/content/pipelineSelector/useCreateSelectors';
import SearchSelector from '#~/components/searchSelector/SearchSelector';

type PipelineSelectorProps = {
  selection?: string;
  onSelect: (pipeline: PipelineKF) => void;
};

const PipelineSelector: React.FC<PipelineSelectorProps> = ({ selection, onSelect }) => {
  const {
    fetchedSize,
    totalSize,
    searchProps,
    onSearchClear,
    onLoadMore,
    sortProps,
    loaded,
    initialLoaded,
    data: pipelines,
  } = usePipelineSelector();

  return (
    <SearchSelector
      dataTestId="pipeline-selector"
      onSearchChange={(newValue) => searchProps.onChange(newValue)}
      onSearchClear={() => onSearchClear()}
      searchValue={searchProps.value ?? ''}
      isLoading={!initialLoaded}
      isFullWidth
      toggleContent={
        initialLoaded
          ? selection || (totalSize === 0 ? 'No pipelines available' : 'Select a pipeline')
          : 'Loading pipelines'
      }
      searchHelpText={`Type a name to search your ${totalSize} pipelines.`}
      isDisabled={totalSize === 0}
    >
      {({ menuClose }) => (
        <TableBase
          itemCount={fetchedSize}
          loading={!loaded}
          data-testid="pipeline-selector-table-list"
          emptyTableView={
            <DashboardEmptyTableView
              hasIcon={false}
              onClearFilters={onSearchClear}
              variant={EmptyStateVariant.xs}
            />
          }
          borders={false}
          variant={TableVariant.compact}
          columns={pipelineSelectorColumns}
          data={pipelines}
          rowRenderer={(row) => (
            <PipelineSelectorTableRow
              key={row.pipeline_id}
              obj={row}
              onClick={() => {
                onSelect(row);
                menuClose();
              }}
            />
          )}
          getColumnSort={getTableColumnSort({
            columns: pipelineSelectorColumns,
            ...sortProps,
          })}
          footerRow={() =>
            loaded ? (
              <PipelineViewMoreFooterRow
                visibleLength={pipelines.length}
                totalSize={fetchedSize}
                errorTitle="Error loading more pipelines"
                onClick={onLoadMore}
                colSpan={2}
              />
            ) : null
          }
        />
      )}
    </SearchSelector>
  );
};

export default PipelineSelector;
