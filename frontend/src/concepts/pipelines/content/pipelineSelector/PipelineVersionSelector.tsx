import * as React from 'react';
import { EmptyStateVariant } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import PipelineSelectorTableRow from '#~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { TableBase, getTableColumnSort } from '#~/components/table';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { pipelineVersionSelectorColumns } from '#~/concepts/pipelines/content/pipelineSelector/columns';
import PipelineViewMoreFooterRow from '#~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineVersionSelector from '#~/concepts/pipelines/content/pipelineSelector/usePipelineVersionSelector';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';
import SearchSelector from '#~/components/searchSelector/SearchSelector';

type PipelineVersionSelectorProps = {
  pipelineId?: string;
  selection?: string;
  isCreatePage?: boolean;
  onSelect: (version: PipelineVersionKF) => void;
};

const PipelineVersionSelector: React.FC<PipelineVersionSelectorProps> = ({
  pipelineId,
  selection,
  isCreatePage,
  onSelect,
}) => {
  const {
    fetchedSize,
    totalSize,
    searchProps,
    onSearchClear,
    onLoadMore,
    sortProps,
    loaded,
    initialLoaded,
    data: versions,
  } = usePipelineVersionSelector(pipelineId);

  // Only filter the unsupported version for create page.
  const supportedVersions = React.useMemo(
    () => (isCreatePage ? versions.filter((v) => !isArgoWorkflow(v.pipeline_spec)) : versions),
    [versions, isCreatePage],
  );
  const supportedVersionsSize = supportedVersions.length;

  return (
    <SearchSelector
      dataTestId="pipeline-version-selector"
      onSearchChange={(newValue) => searchProps.onChange(newValue)}
      onSearchClear={() => onSearchClear()}
      searchValue={searchProps.value ?? ''}
      isLoading={!!pipelineId && !initialLoaded}
      isFullWidth
      toggleContent={
        !pipelineId
          ? 'Select a pipeline version'
          : initialLoaded
          ? selection ||
            (totalSize === 0
              ? 'No versions available'
              : supportedVersionsSize === 0
              ? 'No supported versions available'
              : 'Select a pipeline version')
          : 'Loading pipeline versions'
      }
      searchHelpText={`Type a name to search your ${supportedVersionsSize} versions.`}
      isDisabled={totalSize === 0}
    >
      {({ menuClose }) => (
        <TableBase
          itemCount={fetchedSize}
          loading={!loaded}
          data-testid="pipeline-version-selector-table-list"
          emptyTableView={
            <DashboardEmptyTableView
              hasIcon={false}
              onClearFilters={onSearchClear}
              variant={EmptyStateVariant.xs}
            />
          }
          borders={false}
          variant={TableVariant.compact}
          columns={pipelineVersionSelectorColumns}
          data={supportedVersions}
          rowRenderer={(row) => (
            <PipelineSelectorTableRow
              isRowSelected={row.display_name === selection}
              key={row.pipeline_version_id}
              obj={row}
              onClick={() => {
                onSelect(row);
                menuClose();
              }}
            />
          )}
          getColumnSort={getTableColumnSort({
            columns: pipelineVersionSelectorColumns,
            ...sortProps,
          })}
          footerRow={() =>
            loaded ? (
              <PipelineViewMoreFooterRow
                visibleLength={versions.length}
                totalSize={fetchedSize}
                errorTitle="Error loading more pipeline versions"
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

// TODO: refactor the modal across the app, only render it when it's open
// In that way we don't need the wrapper anymore
const PipelineVersionSelectorWrapper = (
  props: PipelineVersionSelectorProps,
): React.ReactElement => <PipelineVersionSelector key={props.pipelineId} {...props} />;

export default PipelineVersionSelectorWrapper;
