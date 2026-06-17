import { Content, ContentVariants, PageSection } from '@patternfly/react-core';
import React from 'react';
import { UserSubscription } from '~/app/types/subscriptions';
import SubscriptionsToolbar from './SubscriptionsToolbar';
import SubscriptionsViewTable, { ModelGroupEntry } from './SubscriptionsViewTable';
import ModelsViewTable from './ModelsViewTable';
import EmptySubscriptionsTabState from './EmptySubscriptionsTabState';

export const deriveModelGroups = (subscriptions: UserSubscription[]): ModelGroupEntry[] => {
  const modelMap = new Map<string, ModelGroupEntry>();

  subscriptions.forEach((sub) => {
    sub.model_refs.forEach((ref) => {
      const existing = modelMap.get(ref.name);
      const subEntry = {
        subscriptionIdHeader: sub.subscription_id_header,
        displayName: sub.display_name,
        keyCount: sub.key_count,
        tokenRateLimits: ref.token_rate_limits,
      };

      if (existing) {
        existing.subscriptions.push(subEntry);
      } else {
        modelMap.set(ref.name, {
          name: ref.name,
          displayName: ref.display_name,
          description: ref.description,
          source: ref.source,
          subscriptions: [subEntry],
        });
      }
    });
  });

  return Array.from(modelMap.values());
};

export type SubscriptionSortField = 'subscription' | 'model';

type SubscriptionsTabProps = {
  subscriptions: UserSubscription[];
};

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ subscriptions }) => {
  const [searchValue, setSearchValue] = React.useState('');
  const [sortField, setSortField] = React.useState<SubscriptionSortField>('subscription');
  const [modelSortDirection, setModelSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    undefined,
  );
  const [subSortDirection, setSubSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    undefined,
  );

  const modelGroups = React.useMemo(() => deriveModelGroups(subscriptions), [subscriptions]);

  const filteredSubscriptions = React.useMemo(() => {
    let result = subscriptions;
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
  }, [subscriptions, searchValue, subSortDirection]);

  const filteredModelGroups = React.useMemo(() => {
    let result = modelGroups;
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
  }, [modelGroups, searchValue, modelSortDirection]);

  if (subscriptions.length === 0) {
    return (
      <PageSection isFilled>
        <EmptySubscriptionsTabState hasData={false} variant="subscription" />
      </PageSection>
    );
  }

  return (
    <PageSection isFilled>
      <Content component={ContentVariants.p}>
        View your subscriptions and the models they give you access to.
      </Content>
      <SubscriptionsToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortField={sortField}
        onSortFieldChange={setSortField}
      />
      {sortField === 'subscription' ? (
        <SubscriptionsViewTable
          subscriptions={subscriptions}
          filteredSubscriptions={filteredSubscriptions}
          subSortDirection={subSortDirection}
          onSubSortDirectionChange={setSubSortDirection}
        />
      ) : (
        <ModelsViewTable
          modelGroups={modelGroups}
          filteredModelGroups={filteredModelGroups}
          modelSortDirection={modelSortDirection}
          onModelSortDirectionChange={setModelSortDirection}
        />
      )}
    </PageSection>
  );
};

export default SubscriptionsTab;
