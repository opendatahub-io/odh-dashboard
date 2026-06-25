import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { Content, ContentVariants } from '@patternfly/react-core';
import { ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatWindow } from '~/app/utilities/rateLimits';

const formatTokenLimits = (limits: ModelSubscriptionRef['tokenRateLimits']): string => {
  if (limits.length === 0) {
    return '—';
  }
  return limits
    .map((l) => `${l.limit.toLocaleString('en-US')} / ${formatWindow(l.window)}`)
    .join(' | ');
};

type ExpandedSubscriptionModelsPanelProps = {
  models: ModelSubscriptionRef[];
};

const ExpandedSubscriptionModelsPanel: React.FC<ExpandedSubscriptionModelsPanelProps> = ({
  models,
}) => (
  <Table
    aria-label="Subscription models"
    data-testid="subscription-models-expanded-panel"
    variant="compact"
    borders
  >
    <Thead>
      <Tr>
        <Th width={70}>Model name</Th>
        <Th width={30}>Token limits</Th>
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td colSpan={2} data-testid="empty-subscription-models-expanded-panel">
            No models
          </Td>
        </Tr>
      ) : (
        models.map((model) => (
          <Tr
            key={`${model.namespace}/${model.name}`}
            data-testid="expanded-subscription-model-row"
          >
            <Td dataLabel="Model name">
              <span
                className="pf-v6-u-font-weight-bold"
                data-testid="subscription-expanded-model-display-name"
              >
                {model.displayName ?? model.name}
              </span>
              {model.displayName && model.displayName !== model.name && (
                <Content data-testid="subscription-expanded-model-resource-name">
                  {model.name}
                </Content>
              )}
              {model.description && (
                <Content
                  data-testid="subscription-expanded-model-description"
                  component={ContentVariants.small}
                >
                  {model.description}
                </Content>
              )}
            </Td>
            <Td dataLabel="Token limits" data-testid="subscription-expanded-model-token-limits">
              {formatTokenLimits(model.tokenRateLimits)}
            </Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedSubscriptionModelsPanel;
