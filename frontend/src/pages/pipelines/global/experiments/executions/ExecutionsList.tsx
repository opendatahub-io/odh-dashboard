import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useGetExecutionsList } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsList';
import ExecutionsTable from '#~/pages/pipelines/global/experiments/executions/ExecutionsTable';
import { useMlmdListContext } from '#~/concepts/pipelines/context';

const ExecutionsList: React.FC = () => {
  const { filterQuery } = useMlmdListContext();
  const [executionsResponse, isExecutionsLoaded, executionsError] = useGetExecutionsList();
  const { executions, nextPageToken } = executionsResponse || { executions: [] };
  const filterQueryRef = React.useRef(filterQuery);

  if (executionsError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="There was an issue loading executions"
        >
          <EmptyStateBody>{executionsError.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!isExecutionsLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!executions.length && !filterQuery && filterQueryRef.current === filterQuery) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={PlusCircleIcon}
        titleText="No executions"
        data-testid="global-no-executions"
      >
        <EmptyStateBody>
          No experiments have been executed within this project. Select a different project, or
          execute an experiment from the <b>Experiments</b> page.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <ExecutionsTable
      executions={executions}
      nextPageToken={nextPageToken}
      isLoaded={isExecutionsLoaded}
    />
  );
};
export default ExecutionsList;
