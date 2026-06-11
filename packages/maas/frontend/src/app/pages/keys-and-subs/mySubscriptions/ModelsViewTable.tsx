import { Content, ContentVariants, Flex, FlexItem, Label } from '@patternfly/react-core';
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { getSourceLabelColor } from '~/app/pages/keys-and-subs/utils';
import ApiKeyCountLabel from '~/app/components/ApiKeyCountLabel';
import { ModelGroupEntry } from './SubscriptionsViewTable';
import { ModelInfoPopover, formatTokenLimit } from './SubscriptionModelsTable';
import EmptySubscriptionsTabState from './EmptySubscriptionsTabState';

const ModelGroupRow: React.FC<{
  modelGroup: ModelGroupEntry;
  rowIndex: number;
}> = ({ modelGroup, rowIndex }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Tbody isExpanded={isExpanded} data-testid="model-group-row">
      <Tr>
        <Td
          data-testid="expand-model-group"
          expand={{
            rowIndex,
            isExpanded,
            onToggle: () => setIsExpanded((prev) => !prev),
          }}
        />
        <Td dataLabel="Model">
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem className="pf-v6-u-font-weight-bold">
              {modelGroup.displayName || modelGroup.name}
            </FlexItem>
            <FlexItem>
              <ModelInfoPopover
                displayName={modelGroup.displayName || modelGroup.name}
                modelId={modelGroup.name}
                description={modelGroup.description}
              />
            </FlexItem>
            {modelGroup.source && (
              <FlexItem>
                <Label isCompact color={getSourceLabelColor(modelGroup.source)}>
                  {modelGroup.source}
                </Label>
              </FlexItem>
            )}
          </Flex>
          {modelGroup.displayName && modelGroup.name !== modelGroup.displayName && (
            <Content component={ContentVariants.small}>{modelGroup.name}</Content>
          )}
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={2}>
          <ExpandableRowContent>
            <Table
              aria-label={`Subscriptions for ${modelGroup.displayName || modelGroup.name}`}
              variant="compact"
              borders={false}
            >
              <Thead>
                <Tr>
                  <Th width={40}>Subscription</Th>
                  <Th width={30}>API keys</Th>
                  <Th width={30}>Token limits</Th>
                </Tr>
              </Thead>
              <Tbody>
                {modelGroup.subscriptions.length === 0 ? (
                  <Tr>
                    <Td colSpan={3}>No subscriptions for this model.</Td>
                  </Tr>
                ) : (
                  modelGroup.subscriptions.map((sub) => (
                    <Tr key={sub.subscriptionIdHeader} data-testid="model-subscription-row">
                      <Td dataLabel="Subscription">
                        <Link
                          to={`${URL_PREFIX}/keys-and-subs/subscriptions/${sub.subscriptionIdHeader}`}
                        >
                          {sub.displayName || sub.subscriptionIdHeader}
                        </Link>
                      </Td>
                      <Td dataLabel="API keys">
                        <ApiKeyCountLabel keyCount={sub.keyCount ?? 0} />
                      </Td>
                      <Td dataLabel="Token limits">{formatTokenLimit(sub.tokenRateLimits)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

type ModelsViewTableProps = {
  modelGroups: ModelGroupEntry[];
  filteredModelGroups: ModelGroupEntry[];
  modelSortDirection: 'asc' | 'desc' | undefined;
  onModelSortDirectionChange: (direction: 'asc' | 'desc') => void;
};

const ModelsViewTable: React.FC<ModelsViewTableProps> = ({
  modelGroups,
  filteredModelGroups,
  modelSortDirection,
  onModelSortDirectionChange,
}) => {
  if (modelGroups.length === 0) {
    return <EmptySubscriptionsTabState hasData={false} variant="model" />;
  }

  return (
    <Table aria-label="Models table" data-testid="models-table">
      {filteredModelGroups.length > 0 && (
        <Thead>
          <Tr>
            <Th screenReaderText="Expand" />
            <Th
              sort={{
                sortBy: {
                  index: modelSortDirection ? 1 : undefined,
                  direction: modelSortDirection,
                },
                onSort: (_event, _index, direction) => onModelSortDirectionChange(direction),
                columnIndex: 1,
              }}
            >
              Model
            </Th>
          </Tr>
        </Thead>
      )}
      {filteredModelGroups.length === 0 ? (
        <Tbody>
          <Tr>
            <Td colSpan={2}>
              <EmptySubscriptionsTabState hasData variant="model" />
            </Td>
          </Tr>
        </Tbody>
      ) : (
        filteredModelGroups.map((group, index) => (
          <ModelGroupRow key={group.name} modelGroup={group} rowIndex={index} />
        ))
      )}
    </Table>
  );
};

export default ModelsViewTable;
