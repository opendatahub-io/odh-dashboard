import { Content, ContentVariants, PageSection } from '@patternfly/react-core';
import React from 'react';
import { UserSubscription } from '~/app/types/subscriptions';
import SubscriptionsToolbar from './SubscriptionsToolbar';
import SubscriptionsViewTable, { ModelGroupEntry } from './SubscriptionsViewTable';
import ModelsViewTable from './ModelsViewTable';

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
