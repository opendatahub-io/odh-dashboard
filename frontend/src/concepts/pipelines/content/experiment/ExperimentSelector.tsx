import * as React from 'react';
import { EmptyStateVariant, Button } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import { PlusCircleIcon } from '@patternfly/react-icons';
import PipelineSelectorTableRow from '#~/concepts/pipelines/content/pipelineSelector/PipelineSelectorTableRow';
import { TableBase, getTableColumnSort } from '#~/components/table';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import PipelineViewMoreFooterRow from '#~/concepts/pipelines/content/tables/PipelineViewMoreFooterRow';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { useActiveExperimentSelector } from '#~/concepts/pipelines/content/pipelineSelector/useCreateSelectors';
import { experimentSelectorColumns } from '#~/concepts/pipelines/content/experiment/columns';
import SearchSelector from '#~/components/searchSelector/SearchSelector';
import CreateExperimentModal from '#~/concepts/pipelines/content/experiment/CreateExperimentModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';


type ExperimentSelectorProps = {
  selection?: string;
  onSelect: (experiment: ExperimentKF) => void;
};

const InnerExperimentSelector: React.FC<
  ReturnType<typeof useActiveExperimentSelector> & ExperimentSelectorProps
> = ({
  fetchedSize,
  totalSize,
  searchProps,
  onSearchClear,
  onLoadMore,
  sortProps,
  loaded,
  initialLoaded,
  data: experiments,
  selection,
  onSelect,
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { refreshAllAPI } = usePipelinesAPI();

  return (
    <>
      <SearchSelector
        dataTestId="experiment-selector"
        onSearchChange={(newValue) => searchProps.onChange(newValue)}
        onSearchClear={() => onSearchClear()}
        searchValue={searchProps.value ?? ''}
        isLoading={!initialLoaded}
        isFullWidth
        toggleContent={
          initialLoaded
            ? selection || (totalSize === 0 ? 'No experiments available' : 'Select an experiment')
            : 'Loading experiments'
        }
        searchHelpText={`Type a name to search your ${totalSize} experiments.`}
        isDisabled={totalSize === 0}
      >
        {({ menuClose }) => (
          <>
            <TableBase
              itemCount={fetchedSize}
              loading={!loaded}
              emptyTableView={
                <DashboardEmptyTableView
                  hasIcon={false}
                  onClearFilters={onSearchClear}
                  variant={EmptyStateVariant.xs}
                />
              }
              data-testid="experiment-selector-table-list"
              borders={false}
              variant={TableVariant.compact}
              columns={experimentSelectorColumns}
              data={experiments}
              rowRenderer={(row) => (
                <PipelineSelectorTableRow
                  key={row.experiment_id}
                  obj={row}
                  onClick={() => {
                    onSelect(row);
                    menuClose();
                  }}
                />
              )}
              getColumnSort={getTableColumnSort({
                columns: experimentSelectorColumns,
                ...sortProps,
              })}
              footerRow={() =>
                loaded ? (
                  <>
                    <PipelineViewMoreFooterRow
                      visibleLength={experiments.length}
                      totalSize={fetchedSize}
                      errorTitle="Error loading more experiments"
                      onClick={onLoadMore}
                      colSpan={2}
                    />
                    <Button
                      variant="link"
                      icon={<PlusCircleIcon />}
                      onClick={() => {
                        menuClose();
                        setIsModalOpen(true);
                      }}
                      style={{ paddingLeft: '20px' }}
                    >
                      Create new experiment
                    </Button>
                  </>
                ) : null
              }
            />
          </>
        )}
      </SearchSelector>
      {isModalOpen && (
        <CreateExperimentModal
          onClose={(experiment) => {
            setIsModalOpen(false);
            if (experiment) {
              refreshAllAPI();
              onSelect(experiment);
            }
          }}
        />
      )}
    </>
  );
};

export const ActiveExperimentSelector: React.FC<ExperimentSelectorProps> = (props) => {
  const selectorProps = useActiveExperimentSelector();
  return <InnerExperimentSelector {...props} {...selectorProps} />;
};
