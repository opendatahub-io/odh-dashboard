import {
  Button,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { ModelRefInfo, TokenRateLimitInfo } from '~/app/types/subscriptions';
import { formatWindow } from '~/app/utilities/rateLimits';

export const formatTokenLimit = (limits?: TokenRateLimitInfo[]): string => {
  if (!limits || limits.length === 0) {
    return '—';
  }
  return limits
    .map((l) => `${l.limit.toLocaleString('en-US')} / ${formatWindow(l.window)}`)
    .join(', ');
};

export const ModelInfoPopover: React.FC<{
  displayName: string;
  modelId: string;
  description?: string;
}> = ({ displayName, modelId, description }) => (
  <Popover
    headerContent={displayName}
    bodyContent={
      <div data-testid="model-info-popover-body">
        <Content
          component={ContentVariants.small}
          className="pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
        >
          Model ID
        </Content>
        <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied" data-testid="model-id-copy">
          {modelId}
        </ClipboardCopy>
        {description && (
          <>
            <Content
              component={ContentVariants.small}
              className="pf-v6-u-mt-sm pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
            >
              Description
            </Content>
            <Content component={ContentVariants.p} className="pf-v6-u-mt-0">
              {description}
            </Content>
          </>
        )}
      </div>
    }
  >
    <Button variant="plain" aria-label={`More info about ${displayName}`} className="pf-v6-u-p-0">
      <OutlinedQuestionCircleIcon />
    </Button>
  </Popover>
);

export const ModelRow: React.FC<{ model: ModelRefInfo }> = ({ model }) => (
  <Tr data-testid="subscription-model-row">
    <Td dataLabel="Model">
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <span className="pf-v6-u-font-weight-bold">{model.display_name || model.name}</span>
        </FlexItem>
        <FlexItem>
          <ModelInfoPopover
            displayName={model.display_name || model.name}
            modelId={model.name}
            description={model.description}
          />
        </FlexItem>
      </Flex>
      {model.display_name && model.name !== model.display_name && (
        <Content component={ContentVariants.small}>{model.name}</Content>
      )}
    </Td>
    <Td dataLabel="Token limits">{formatTokenLimit(model.token_rate_limits)}</Td>
  </Tr>
);

type SubscriptionModelsTableProps = {
  models: ModelRefInfo[];
  ariaLabel?: string;
  tableTestId?: string;
};

const SubscriptionModelsTable: React.FC<SubscriptionModelsTableProps> = ({
  models,
  ariaLabel = 'Subscription models table',
  tableTestId = 'subscription-models-table',
}) => (
  <Table aria-label={ariaLabel} data-testid={tableTestId} variant="compact" borders={false}>
    <Thead>
      <Tr>
        <Th width={60}>Name</Th>
        <Th width={40}>Token limits</Th>
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td dataLabel="Model">No models in this subscription.</Td>
          <Td dataLabel="Token limits">—</Td>
        </Tr>
      ) : (
        models.map((model) => <ModelRow key={model.name} model={model} />)
      )}
    </Tbody>
  </Table>
);

export default SubscriptionModelsTable;
