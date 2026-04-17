import * as React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import { useListSubscriptions } from '~/app/hooks/useListSubscriptions';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { SubscriptionsTable } from './allSubscriptions/SubscriptionsTable';
import SubscriptionsToolbar from './allSubscriptions/SubscriptionsToolbar';
import {
  initialSubscriptionsFilterData,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from './allSubscriptions/const';
import DeleteSubscriptionModal from './DeleteSubscriptionModal';
import EmptySubscriptionsPage from './EmptySubscriptionsPage';

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
      ? subscriptions.filter((sub) => sub.name.toLowerCase().includes(keyword))
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
      emptyStatePage={<EmptySubscriptionsPage />}
      loaded={loaded}
      loadError={error}
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
