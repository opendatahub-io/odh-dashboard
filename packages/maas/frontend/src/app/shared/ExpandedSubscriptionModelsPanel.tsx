import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '~/app/pages/subscriptions/viewSubscription/utils';

type ExpandedSubscriptionModelsPanelProps = {
  models: ModelSubscriptionRef[];
  testId?: string;
};

const ExpandedSubscriptionModelsPanel: React.FC<ExpandedSubscriptionModelsPanelProps> = ({
  models,
  testId = 'expanded-subscription-models-panel',
}) => (
  <Table aria-label="Subscription models" data-testid={testId} variant="compact" borders={false}>
    <Thead>
      <Tr>
        <Th width={40}>Model name</Th>
        <Th width={30}>Token limits</Th>
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td colSpan={3} data-testid="no-models-row">
            No models
          </Td>
        </Tr>
      ) : (
        models.map((model) => (
          <Tr
            key={`${model.namespace}/${model.name}`}
            data-testid="expanded-subscription-model-row"
          >
            <Td dataLabel="Model name">{model.name}</Td>
            <Td dataLabel="Token limits">
              {formatTokenLimits(models, model.namespace, model.name)}
            </Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedSubscriptionModelsPanel;
