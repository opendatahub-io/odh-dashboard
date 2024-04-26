import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Execution } from '~/third_party/mlmd';
import ExecutionsTableRowStatusIcon from '~/pages/pipelines/global/experiments/executions/ExecutionsTableRowStatusIcon';

type ExecutionsTableRowProps = {
  obj: Execution;
};

const ExecutionsTableRow: React.FC<ExecutionsTableRowProps> = ({ obj }) => (
  <Tr>
    <Td dataLabel="Executions">
      {obj.getCustomPropertiesMap().get('task_name')?.getStringValue() || '(No name)'}
    </Td>
    <Td dataLabel="Status">
      <ExecutionsTableRowStatusIcon status={obj.getLastKnownState()} />
    </Td>
    <Td dataLabel="ID">{obj.getId()}</Td>
    <Td dataLabel="Type">{obj.getType()}</Td>
  </Tr>
);

export default ExecutionsTableRow;
