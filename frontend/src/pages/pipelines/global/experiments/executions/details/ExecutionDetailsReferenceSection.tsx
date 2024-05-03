import React from 'react';
import { Skeleton, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Execution } from '~/third_party/mlmd';
import { useGetPipelineRunContextByExecution } from '~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextByExecution';
import { executionDetailsRoute, routePipelineRunDetailsNamespace } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ExecutionDetailsReferenceSectionProps = {
  execution: Execution;
};

const ExecutionDetailsReferenceSection: React.FC<ExecutionDetailsReferenceSectionProps> = ({
  execution,
}) => {
  const { namespace } = usePipelinesAPI();
  const [context, contextLoaded] = useGetPipelineRunContextByExecution(execution);

  const originalExecutionId = execution
    .getCustomPropertiesMap()
    .get('cached_execution_id')
    ?.getStringValue();

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">Reference</Title>
      </StackItem>
      <StackItem>
        <Table aria-label="Execution details reference table" variant="compact" borders={false}>
          <Thead>
            <Tr>
              <Th width={30}>Name</Th>
              <Th width={70}>Link</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td dataLabel="Name">Pipeline run</Td>
              <Td dataLabel="Link">
                {contextLoaded ? (
                  context ? (
                    <Link to={routePipelineRunDetailsNamespace(namespace, context.getName())}>
                      {`runs/details/${context.getName()}`}
                    </Link>
                  ) : (
                    'Unknown'
                  )
                ) : (
                  <Skeleton />
                )}
              </Td>
            </Tr>
            {originalExecutionId && (
              <Tr>
                <Td dataLabel="Name">Original execution</Td>
                <Td dataLabel="Link">
                  <Link to={executionDetailsRoute(namespace, originalExecutionId)}>
                    {`execution/${originalExecutionId}`}
                  </Link>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </StackItem>
    </Stack>
  );
};

export default ExecutionDetailsReferenceSection;
