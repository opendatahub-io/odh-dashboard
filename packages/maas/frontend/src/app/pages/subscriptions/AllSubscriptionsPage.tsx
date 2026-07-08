import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import { useListSubscriptions } from '~/app/hooks/useListSubscriptions';
import { MaaSSubscription } from '~/app/types/subscriptions';
import EmptyStatePage from '~/app/pages/subscription-management/EmptyStatePage';
import { SubscriptionsTable } from './allSubscriptions/SubscriptionsTable';
import SubscriptionsToolbar from './allSubscriptions/SubscriptionsToolbar';
import {
  initialSubscriptionsFilterData,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from './allSubscriptions/const';
import DeleteSubscriptionModal from './DeleteSubscriptionModal';

const AllSubscriptionsPage: React.FC = () => {
  const [subscriptions, loaded, error, refresh] = useListSubscriptions();
  const [filterData, setFilterData] = React.useState<SubscriptionsFilterDataType>(
    initialSubscriptionsFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialSubscriptionsFilterData), []);

  const filteredSubscriptions = React.useMemo(() => {
    const keyword = filterData[SubscriptionsFilterOptions.keyword]?.toLowerCase();
    return keyword
      ? subscriptions.filter(
          (sub) =>
            sub.name.toLowerCase().includes(keyword) ||
            sub.displayName?.toLowerCase().includes(keyword) ||
            sub.description?.toLowerCase().includes(keyword),
        )
      : subscriptions;
  }, [subscriptions, filterData]);

  const [deleteSubscription, setDeleteSubscription] = React.useState<MaaSSubscription | undefined>(
    undefined,
  );

  return (
    <ApplicationsPage
      title="Subscriptions"
      description="Create subscriptions to manage group access to MaaS endpoints, and to set token limits for each model."
      empty={loaded && !error && subscriptions.length === 0}
      emptyStatePage={
        <EmptyStatePage
          testId="empty-subscriptions-page"
          title="No subscriptions"
          bodyText="Subscriptions define rate limits and token quotas for MaaS model access. Create a
        subscription to control how much each group can consume."
          showSubsButton
        />
      }
      loaded={loaded || !!error}
      loadError={error}
      errorMessage="Error loading subscriptions"
    >
      {loaded && (
        <PageSection isFilled>
          <SubscriptionsTable
            subscriptions={filteredSubscriptions}
            onClearFilters={onClearFilters}
            toolbarContent={
              <SubscriptionsToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
            }
            setDeleteSubscription={setDeleteSubscription}
          />
        </PageSection>
      )}
      {deleteSubscription && (
        <DeleteSubscriptionModal
          subscription={deleteSubscription}
          onClose={() => {
            setDeleteSubscription(undefined);
            refresh();
          }}
        />
      )}
    </ApplicationsPage>
  );
};

export default AllSubscriptionsPage;
