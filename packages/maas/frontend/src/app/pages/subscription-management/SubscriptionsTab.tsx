import * as React from 'react';
import { Alert, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { useListSubscriptions } from '~/app/hooks/useListSubscriptions';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { SubscriptionsTable } from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsTable';
import SubscriptionsToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsToolbar';
import {
  initialSubscriptionsFilterData,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
} from '~/app/pages/subscriptions/allSubscriptions/const';
import DeleteSubscriptionModal from '~/app/pages/subscriptions/DeleteSubscriptionModal';
import EmptySubscriptionsPage from '~/app/pages/subscriptions/EmptySubscriptionsPage';

type SubscriptionsTabProps = {
  returnTo?: string;
};

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ returnTo }) => {
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

  if (!loaded && !error) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection isFilled>
        <Alert variant="danger" isInline title="Error loading subscriptions">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (subscriptions.length === 0) {
    return <EmptySubscriptionsPage returnTo={returnTo} />;
  }

  return (
    <>
      {loaded && (
        <PageSection isFilled>
          <SubscriptionsTable
            subscriptions={filteredSubscriptions}
            onClearFilters={onClearFilters}
            toolbarContent={
              <SubscriptionsToolbar
                filterData={filterData}
                onFilterUpdate={onFilterUpdate}
                returnTo={returnTo}
              />
            }
            setDeleteSubscription={setDeleteSubscription}
            returnTo={returnTo}
          />
        </PageSection>
      )}
      {deleteSubscription && (
        <DeleteSubscriptionModal
          subscription={deleteSubscription}
          onClose={(deleted?: boolean) => {
            setDeleteSubscription(undefined);
            if (deleted) {
              refresh();
            }
          }}
        />
      )}
    </>
  );
};

export default SubscriptionsTab;
