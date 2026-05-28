import {
  Bullseye,
  Button,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Popover,
  Spinner,
} from '@patternfly/react-core';
import { KeyIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';
import { ModelRefInfo, UserSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { ModelGroupEntry, deriveModelGroups, formatTokenLimit, getSourceLabelColor } from './utils';
import EmptySubscriptionsTabState from './EmptySubscriptionsTabState';
import SubscriptionsToolbar from './SubscriptionsToolbar';

export type SubscriptionSortField = 'subscription' | 'model';

const ModelInfoPopover: React.FC<{
  displayName: string;
  modelId: string;
  description?: string;
}> = ({ displayName, modelId, description }) => (
  <Popover
    headerContent={displayName}
    bodyContent={
      <div data-testid="model-info-popover-body">
        <Content component={ContentVariants.small} className="pf-v6-u-mb-0">
          <strong>Model ID</strong>
        </Content>
        <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied" data-testid="model-id-copy">
          {modelId}
        </ClipboardCopy>
        {description && (
          <>
            <Content component={ContentVariants.small} className="pf-v6-u-mt-sm pf-v6-u-mb-0">
              <strong>Description</strong>
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

const ModelRow: React.FC<{ model: ModelRefInfo }> = ({ model }) => (
  <Tr data-testid="subscription-model-row">
    <Td dataLabel="Model">
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <strong>{model.display_name || model.name}</strong>
        </FlexItem>
        <FlexItem>
          <ModelInfoPopover
            displayName={model.display_name || model.name}
            modelId={model.name}
            description={model.description}
          />
        </FlexItem>
        {model.source && (
          <FlexItem>
            <Label isCompact color={getSourceLabelColor(model.source)}>
              {model.source}
            </Label>
          </FlexItem>
        )}
      </Flex>
      {model.display_name && model.name !== model.display_name && (
        <Content component={ContentVariants.small}>{model.name}</Content>
      )}
    </Td>
    <Td dataLabel="Token limits">{formatTokenLimit(model.token_rate_limits)}</Td>
  </Tr>
);

const SubscriptionRow: React.FC<{
  subscription: UserSubscription;
  rowIndex: number;
}> = ({ subscription, rowIndex }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Tbody isExpanded={isExpanded} data-testid="subscription-row">
      <Tr>
        <Td
          data-testid="expand-subscription"
          expand={{
            rowIndex,
            isExpanded,
            onToggle: () => setIsExpanded((prev) => !prev),
          }}
        />
        <Td dataLabel="Subscription">
          <Link
            to={`${URL_PREFIX}/keys-and-subs/subscriptions/${subscription.subscription_id_header}`}
          >
            {subscription.display_name || subscription.subscription_id_header}
          </Link>
          {subscription.key_count != null && subscription.key_count > 0 && (
            <>
              {' '}
              <Label isCompact icon={<KeyIcon />} color="green">
                {subscription.key_count} {subscription.key_count === 1 ? 'key' : 'keys'}
              </Label>
            </>
          )}
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={2}>
          <ExpandableRowContent>
            <Table
              aria-label={`Models for ${subscription.display_name || subscription.subscription_id_header}`}
              variant="compact"
              borders={false}
            >
              <Thead>
                <Tr>
                  <Th width={60}>Model</Th>
                  <Th width={40}>Token limits</Th>
                </Tr>
              </Thead>
              <Tbody>
                {subscription.model_refs.length === 0 ? (
                  <Tr>
                    <Td dataLabel="Model">No models in this subscription.</Td>
                    <Td dataLabel="Token limits">—</Td>
                  </Tr>
                ) : (
                  subscription.model_refs.map((model) => (
                    <ModelRow key={model.name} model={model} />
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
            <FlexItem>
              <strong>{modelGroup.displayName || modelGroup.name}</strong>
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
                        {sub.keyCount != null && sub.keyCount > 0 ? (
                          <Label isCompact icon={<KeyIcon />} color="green">
                            {sub.keyCount} {sub.keyCount === 1 ? 'key' : 'keys'}
                          </Label>
                        ) : (
                          '—'
                        )}
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

const SubscriptionsTab: React.FC = () => {
  const [subSourceFilters, setSubSourceFilters] = React.useState<string[]>([]);
  const [modelSourceFilters, setModelSourceFilters] = React.useState<string[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [sortField, setSortField] = React.useState<SubscriptionSortField>('subscription');
  const [modelSortDirection, setModelSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    undefined,
  );
  const [subSortDirection, setSubSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    undefined,
  );

  const [subscriptions, loaded] = useUserSubscriptions();

  const modelGroups = React.useMemo(() => deriveModelGroups(subscriptions), [subscriptions]);

  const filteredSubscriptions = React.useMemo(() => {
    let result = subscriptions;
    if (subSourceFilters.length > 0) {
      const allowed = subSourceFilters.map((f) => f.toLowerCase());
      result = result.filter((sub) =>
        sub.model_refs.some((ref) => ref.source && allowed.includes(ref.source.toLowerCase())),
      );
    }
    if (searchValue.trim()) {
      const term = searchValue.trim().toLowerCase();
      result = result.filter((sub) => {
        const subName = (sub.display_name || sub.subscription_id_header).toLowerCase();
        if (subName.includes(term)) {
          return true;
        }
        return sub.model_refs.some((ref) => {
          const modelName = (ref.display_name || ref.name).toLowerCase();
          return modelName.includes(term);
        });
      });
    }
    if (!subSortDirection) {
      return result;
    }
    return result.toSorted((a, b) => {
      const nameA = (a.display_name || a.subscription_id_header).toLowerCase();
      const nameB = (b.display_name || b.subscription_id_header).toLowerCase();
      return subSortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }, [subscriptions, subSourceFilters, searchValue, subSortDirection]);

  const filteredModelGroups = React.useMemo(() => {
    let result = modelGroups;
    if (modelSourceFilters.length > 0) {
      const allowed = modelSourceFilters.map((f) => f.toLowerCase());
      result = result.filter(
        (group) => group.source && allowed.includes(group.source.toLowerCase()),
      );
    }
    if (searchValue.trim()) {
      const term = searchValue.trim().toLowerCase();
      result = result.filter((group) => {
        const modelName = (group.displayName || group.name).toLowerCase();
        if (modelName.includes(term)) {
          return true;
        }
        return group.subscriptions.some((sub) => {
          const subName = (sub.displayName || sub.subscriptionIdHeader).toLowerCase();
          return subName.includes(term);
        });
      });
    }
    if (!modelSortDirection) {
      return result;
    }
    return result.toSorted((a, b) => {
      const nameA = (a.displayName || a.name).toLowerCase();
      const nameB = (b.displayName || b.name).toLowerCase();
      return modelSortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }, [modelGroups, modelSourceFilters, searchValue, modelSortDirection]);

  if (!loaded) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  return (
    <PageSection isFilled>
      <Content component={ContentVariants.p}>
        Models available to you through your subscriptions, with token limits. Click a subscription
        to create a key for it.
      </Content>
      <SubscriptionsToolbar
        sourceFilters={sortField === 'subscription' ? subSourceFilters : modelSourceFilters}
        onSourceToggle={(source) => {
          const setter = sortField === 'subscription' ? setSubSourceFilters : setModelSourceFilters;
          setter((prev) =>
            prev.includes(source) ? prev.filter((f) => f !== source) : [...prev, source],
          );
        }}
        onSourceClear={(source) => {
          const setter = sortField === 'subscription' ? setSubSourceFilters : setModelSourceFilters;
          setter((prev) => prev.filter((f) => f !== source));
        }}
        onClearAllFilters={() => {
          const setter = sortField === 'subscription' ? setSubSourceFilters : setModelSourceFilters;
          setter([]);
        }}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortField={sortField}
        onSortFieldChange={setSortField}
      />
      {sortField === 'subscription' ? (
        subscriptions.length === 0 ? (
          <EmptySubscriptionsTabState hasData={false} variant="subscription" />
        ) : (
          <Table aria-label="Subscriptions table" data-testid="subscriptions-table">
            <Thead>
              <Tr>
                <Th screenReaderText="Expand" />
                <Th
                  sort={{
                    sortBy: {
                      index: subSortDirection ? 1 : undefined,
                      direction: subSortDirection,
                    },
                    onSort: (_event, _index, direction) => setSubSortDirection(direction),
                    columnIndex: 1,
                  }}
                >
                  Subscription
                </Th>
              </Tr>
            </Thead>
            {filteredSubscriptions.length === 0 ? (
              <Tbody>
                <Tr>
                  <Td colSpan={2}>
                    <EmptySubscriptionsTabState hasData variant="subscription" />
                  </Td>
                </Tr>
              </Tbody>
            ) : (
              filteredSubscriptions.map((sub, index) => (
                <SubscriptionRow
                  key={sub.subscription_id_header}
                  subscription={sub}
                  rowIndex={index}
                />
              ))
            )}
          </Table>
        )
      ) : modelGroups.length === 0 ? (
        <EmptySubscriptionsTabState hasData={false} variant="model" />
      ) : (
        <Table aria-label="Models table" data-testid="models-table">
          <Thead>
            <Tr>
              <Th screenReaderText="Expand" />
              <Th
                sort={{
                  sortBy: {
                    index: modelSortDirection ? 1 : undefined,
                    direction: modelSortDirection,
                  },
                  onSort: (_event, _index, direction) => setModelSortDirection(direction),
                  columnIndex: 1,
                }}
              >
                Model
              </Th>
            </Tr>
          </Thead>
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
      )}
    </PageSection>
  );
};

export default SubscriptionsTab;
