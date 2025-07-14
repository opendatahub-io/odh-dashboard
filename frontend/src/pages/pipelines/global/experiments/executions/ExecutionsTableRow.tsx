import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Execution } from '#~/third_party/mlmd';
import { getExecutionDisplayName } from '#~/pages/pipelines/global/experiments/executions/utils';
import { executionDetailsRoute } from '#~/routes/pipelines/executions';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExecutionStatus } from '#~/pages/pipelines/global/experiments/executions/ExecutionStatus';

type ExecutionsTableRowProps = {
  obj: Execution;
};

const ExecutionsTableRow: React.FC<ExecutionsTableRowProps> = ({ obj }) => {
  const { namespace } = usePipelinesAPI();
  return (
    <Tr>
      <Td dataLabel="Executions">
        <Link to={executionDetailsRoute(namespace, obj.getId().toString())}>
          {getExecutionDisplayName(obj)}
        </Link>
      </Td>
      <Td dataLabel="Status">
        <ExecutionStatus status={obj.getLastKnownState()} isCompact />
      </Td>
      <Td dataLabel="ID">{obj.getId()}</Td>
      <Td dataLabel="Type">{obj.getType()}</Td>
    </Tr>
  );
};

export default ExecutionsTableRow;
