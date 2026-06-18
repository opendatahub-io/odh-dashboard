import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { ModelRef } from '~/app/types/subscriptions';

type ExpandedAuthPolicyModelsPanelProps = {
  models: ModelRef[];
  testId?: string;
};

const ExpandedAuthPolicyModelsPanel: React.FC<ExpandedAuthPolicyModelsPanelProps> = ({
  models,
  testId = 'expanded-auth-policy-models-panel',
}) => (
  <Table aria-label="Auth policy models" data-testid={testId} variant="compact" borders={false}>
    <Thead>
      <Tr>
        <Th width={50}>Model name</Th>
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td colSpan={2} data-testid="no-models-row">
            No models
          </Td>
        </Tr>
      ) : (
        models.map((model) => (
          <Tr key={`${model.namespace}/${model.name}`} data-testid="expanded-auth-policy-model-row">
            <Td dataLabel="Model name">{model.name}</Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedAuthPolicyModelsPanel;
