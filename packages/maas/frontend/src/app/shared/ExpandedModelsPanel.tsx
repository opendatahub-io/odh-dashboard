import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { Content, ContentVariants } from '@patternfly/react-core';
import { ModelRef, ModelSubscriptionRef } from '~/app/types/subscriptions';
import { formatTokenLimits } from '~/app/utilities/rateLimits';

type ExpandedModelsPanelProps = {
  models: ModelSubscriptionRef[] | ModelRef[];
  showTokenLimits?: boolean;
  testIdResource?: string;
};

const ExpandedModelsPanel: React.FC<ExpandedModelsPanelProps> = ({
  models,
  showTokenLimits = true,
  testIdResource = 'subscription',
}) => (
  <Table
    aria-label={`${testIdResource} models`}
    data-testid={`${testIdResource}-models-expanded-panel`}
    variant="compact"
    borders
  >
    <Thead>
      <Tr>
        <Th width={70}>Model name</Th>
        {showTokenLimits && <Th width={30}>Token limits</Th>}
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td
            colSpan={showTokenLimits ? 2 : 1}
            data-testid={`empty-${testIdResource}-models-expanded-panel`}
          >
            No models
          </Td>
        </Tr>
      ) : (
        models.map((model) => (
          <Tr
            key={`${model.namespace}/${model.name}`}
            data-testid={`expanded-${testIdResource}-model-row`}
          >
            <Td dataLabel="Model name">
              <span
                className="pf-v6-u-font-weight-bold"
                data-testid={`${testIdResource}-expanded-model-display-name`}
              >
                {model.displayName ?? model.name}
              </span>
              {model.displayName && model.displayName !== model.name && (
                <Content data-testid={`${testIdResource}-expanded-model-resource-name`}>
                  {model.name}
                </Content>
              )}
              {model.description && (
                <Content
                  data-testid={`${testIdResource}-expanded-model-description`}
                  component={ContentVariants.small}
                >
                  {model.description}
                </Content>
              )}
            </Td>
            {showTokenLimits && 'tokenRateLimits' in model && (
              <Td
                dataLabel="Token limits"
                data-testid={`${testIdResource}-expanded-model-token-limits`}
              >
                {formatTokenLimits(model.tokenRateLimits)}
              </Td>
            )}
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedModelsPanel;
