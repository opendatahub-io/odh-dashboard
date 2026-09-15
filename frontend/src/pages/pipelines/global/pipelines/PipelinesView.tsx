import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import EmptyStateErrorMessage from '@odh-dashboard/ui-core/components/EmptyStateErrorMessage';
import UnauthorizedError from '@odh-dashboard/ui-core/components/UnauthorizedError';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import GlobalNoPipelines from '#~/pages/pipelines/global/pipelines/GlobalNoPipelines';
import PipelinesTable from '#~/concepts/pipelines/content/tables/pipeline/PipelinesTable';
import usePipelinesTable from '#~/concepts/pipelines/content/tables/pipeline/usePipelinesTable';
import GlobalPipelinesTableToolbar from '#~/pages/pipelines/global/pipelines/GlobalPipelinesTableToolbar';
import usePipelineFilter from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import {
  getTablePagingProps,
  getTableSortProps,
} from '#~/concepts/pipelines/content/tables/usePipelineTable';

const PipelinesView: React.FC = () => {
  const [
    [{ items: pipelines, totalSize }, loaded, loadError, refresh],
    { initialLoaded, ...tableProps },
  ] = usePipelinesTable();
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilter(tableProps.setFilter);
  const pagingProps = getTablePagingProps(tableProps);
  const sortProps = getTableSortProps(tableProps);

  if (loadError) {
    if (getGenericErrorCode(loadError) === 403) {
      return <UnauthorizedError accessDomain="pipelines" />;
    }
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
      {...sortProps}
      {...pagingProps}
      totalSize={totalSize}
      loading={!loaded}
      pipelines={pipelines}
      enablePagination="compact"
      refreshPipelines={refresh}
      onClearFilters={onClearFilters}
      toolbarContent={<GlobalPipelinesTableToolbar {...filterToolbarProps} />}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
    />
  );
};

export default PipelinesView;
