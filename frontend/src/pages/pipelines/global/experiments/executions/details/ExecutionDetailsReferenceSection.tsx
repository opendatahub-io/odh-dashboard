import React from 'react';
import { Skeleton, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Execution } from '~/third_party/mlmd';
import { useGetPipelineRunContextByExecution } from '~/concepts/pipelines/apiHooks/mlmd/useGetMlmdContextByExecution';
import { executionDetailsRoute, experimentRunDetailsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { getOriginalExecutionId } from '~/pages/pipelines/global/experiments/executions/utils';

type ExecutionDetailsReferenceSectionProps = {
  execution: Execution;
};

const ExecutionDetailsReferenceSection: React.FC<ExecutionDetailsReferenceSectionProps> = ({
  execution,
}) => {
  const { namespace } = usePipelinesAPI();
  const [context] = useGetPipelineRunContextByExecution(execution.getId());
  const [run, runLoaded, runError] = usePipelineRunById(context?.getName());
  const originalExecutionId = getOriginalExecutionId(execution);

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
                {runLoaded && !runError ? (
                  run ? (
                    <Link to={experimentRunDetailsRoute(namespace, run.experiment_id, run.run_id)}>
                      {`runs/details/${run.run_id}`}
                    </Link>
                  ) : context?.getName() ? (
                    `runs/details/${context.getName()}`
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
