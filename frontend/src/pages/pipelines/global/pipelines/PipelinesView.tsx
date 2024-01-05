import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import GlobalNoPipelines from '~/pages/pipelines/global/pipelines/GlobalNoPipelines';
import PipelinesTable from '~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import usePipelinesTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import GlobalPipelinesTableToolbar from '~/pages/pipelines/global/pipelines/GlobalPipelinesTableToolbar';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';

const PipelinesView: React.FC = () => {
  const [
    [{ items: pipelines, totalSize }, loaded, loadError, refresh],
    { initialLoaded, ...tableProps },
  ] = usePipelinesTable();
  const filterToolbarProps = usePipelineFilter(tableProps.setFilter);

  if (loadError) {
    return (
      <EmptyStateErrorMessage title="Error displaying pipelines" bodyText={loadError.message} />
    );
  }

  if (!loaded && !initialLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loaded && totalSize === 0 && !tableProps.filter) {
    return <GlobalNoPipelines />;
  }

  return (
    <PipelinesTable
      {...tableProps}
      totalSize={totalSize}
      loading={!loaded}
      pipelines={pipelines}
      enablePagination="compact"
      refreshPipelines={refresh}
      pipelineDetailsPath={(namespace, id) => `/pipelines/${namespace}/pipeline/view/${id}`}
      toolbarContent={<GlobalPipelinesTableToolbar {...filterToolbarProps} />}
      emptyTableView={<EmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />}
    />
  );
};

export default PipelinesView;
