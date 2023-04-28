import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import GlobalNoPipelines from '~/pages/pipelines/global/pipelines/GlobalNoPipelines';
import PipelinesTable from '~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import GlobalPipelinesTableToolbar, { FilterType, FilterData } from './GlobalPipelinesTableToolbar';

const DEFAULT_FILTER_DATA: FilterData = {
  [FilterType.PIPELINE_NAME]: '',
  [FilterType.CREATED_ON]: '',
};

const PipelinesView: React.FC = () => {
  const [pipelines, loaded, loadError, refresh] = usePipelines();
  const [filterData, setFilterData] = React.useState<FilterData>(DEFAULT_FILTER_DATA);

  if (loadError) {
    return (
      <EmptyStateErrorMessage title="Error displaying pipelines" bodyText={loadError.message} />
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (pipelines.length === 0) {
    return <GlobalNoPipelines />;
  }

  const filteredPipelines = pipelines.filter((value) => {
    const filterName = filterData[FilterType.PIPELINE_NAME];
    const filterDate = filterData[FilterType.CREATED_ON];

    if (filterName && !value.name.includes(filterName)) {
      return false;
    }
    if (filterDate && !value.created_at.includes(filterDate)) {
      return false;
    }

    return true;
  });

  return (
    <PipelinesTable
      pipelines={filteredPipelines}
      enablePagination
      toolbarContent={
        <GlobalPipelinesTableToolbar
          filterData={filterData}
          onFilterUpdate={(filterType, value) =>
            setFilterData((lastFilter) => ({ ...lastFilter, [filterType]: value }))
          }
          onClearFilters={() => setFilterData(DEFAULT_FILTER_DATA)}
        />
      }
      emptyTableView={<EmptyTableView onClearFilters={() => setFilterData(DEFAULT_FILTER_DATA)} />}
      refreshPipelines={refresh}
      pipelineDetailsPath={(namespace, id) => `/pipelines/${namespace}/${id}`}
    />
  );
};

export default PipelinesView;
