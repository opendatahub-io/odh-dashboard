import React from 'react';
import { Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Execution } from '#~/third_party/mlmd';
import { executionDetailsRoute } from '#~/routes/pipelines/executions';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getOriginalExecutionId } from '#~/pages/pipelines/global/experiments/executions/utils';
import ExperimentPipelineRunLink from '#~/pages/pipelines/global/experiments/ExperimentPipelineRunLink';

type ExecutionDetailsReferenceSectionProps = {
  execution: Execution;
};

const ExecutionDetailsReferenceSection: React.FC<ExecutionDetailsReferenceSectionProps> = ({
  execution,
}) => {
  const { namespace } = usePipelinesAPI();
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
                <ExperimentPipelineRunLink executionId={execution.getId()} namespace={namespace} />
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
