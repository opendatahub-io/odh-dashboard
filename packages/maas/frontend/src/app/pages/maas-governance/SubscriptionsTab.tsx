import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { SubscriptionsTable } from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsTable';
import SubscriptionsToolbar from '~/app/pages/subscriptions/allSubscriptions/SubscriptionsToolbar';
import {
  initialSubscriptionsFilterData,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
  SubscriptionsFilterSelection,
} from '~/app/pages/subscriptions/allSubscriptions/const';
import DeleteSubscriptionModal from '~/app/pages/subscriptions/DeleteSubscriptionModal';
import ModelAccessToolbar from '~/app/pages/model-access/ModelAccessToolbar';
import {
  EventTrackingResourceType,
  EventTrackingSource,
  MaaSEvents,
  MaaSResourceDeletedProperties,
} from '~/app/types/event-tracking';
import EmptyStatePage from './EmptyStatePage';

type SubscriptionsTabProps = {
  returnTo?: string;
  /**
   * Read-only viewer: hides the Status and row-actions columns, the create button,
   * and the delete confirmation modal. Defaults to false (admin governance page).
   */
  readOnly?: boolean;
  /**
   * Filter through Subscription / Group / Model typeahead selects (model access viewer)
   * instead of the free-text keyword search. Filter options derive from the loaded
   * subscriptions, so no additional fetches are required.
   */
  attributeFilters?: boolean;

  /** Overrides the subscription name link target. Defaults to the governance view page. */
  getSubscriptionDetailUrl?: (name: string) => string;
};

const asFilterSelection = (
  value: string | SubscriptionsFilterSelection | undefined,
): SubscriptionsFilterSelection | undefined =>
  typeof value === 'string' ? (value ? { label: value, value } : undefined) : value;

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  returnTo,
  readOnly = false,
  attributeFilters = false,
  getSubscriptionDetailUrl,
}) => {
  const {
    subscriptions,
    subscriptionsLoaded: loaded,
    subscriptionsError: error,
    refresh,
  } = useMaaSGovernanceContext();
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
    const keyword = filterData[SubscriptionsFilterOptions.keyword];
    const keywordText = typeof keyword === 'string' ? keyword.toLowerCase() : '';
    const subscriptionFilter = asFilterSelection(
      filterData[SubscriptionsFilterOptions.subscription],
    );
    const groupFilter = asFilterSelection(filterData[SubscriptionsFilterOptions.group]);
    const modelFilter = asFilterSelection(filterData[SubscriptionsFilterOptions.model]);

    if (!keywordText && !subscriptionFilter && !groupFilter && !modelFilter) {
      return subscriptions;
    }

    return subscriptions.filter((subscription) => {
      if (
        keywordText &&
        !subscription.name.toLowerCase().includes(keywordText) &&
        !(subscription.displayName ?? '').toLowerCase().includes(keywordText) &&
        !(subscription.description ?? '').toLowerCase().includes(keywordText)
      ) {
        return false;
      }
      if (subscriptionFilter && subscription.name !== subscriptionFilter.value) {
        return false;
      }
      if (
        groupFilter &&
        !subscription.owner.groups.some((group) => group.name === groupFilter.value)
      ) {
        return false;
      }
      if (modelFilter && !subscription.modelRefs.some((ref) => ref.name === modelFilter.value)) {
        return false;
      }
      return true;
    });
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
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Error loading subscriptions"
          variant={EmptyStateVariant.lg}
          data-testid="error-empty-state"
        >
          <EmptyStateBody data-testid="error-empty-state-body">{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyStatePage
        returnTo={returnTo}
        testId="empty-subscriptions-page"
        title="No subscriptions"
        bodyText="Subscriptions define token limits for model access. Create a subscription to control usage for each user group."
        showSubsButton={!readOnly}
      />
    );
  }

  return (
    <>
      {loaded && (
        <PageSection isFilled>
          <SubscriptionsTable
            subscriptions={filteredSubscriptions}
            onClearFilters={onClearFilters}
            toolbarContent={
              attributeFilters ? (
                <ModelAccessToolbar
                  filterData={filterData}
                  onFilterUpdate={onFilterUpdate}
                  subscriptions={subscriptions}
                />
              ) : (
                <SubscriptionsToolbar
                  filterData={filterData}
                  onFilterUpdate={onFilterUpdate}
                  returnTo={returnTo}
                  showCreateButton={!readOnly}
                />
              )
            }
            setDeleteSubscription={setDeleteSubscription}
            returnTo={returnTo}
            showStatus={!readOnly}
            showActions={!readOnly}
            getSubscriptionDetailUrl={getSubscriptionDetailUrl}
          />
        </PageSection>
      )}
      {!readOnly && deleteSubscription && (
        <DeleteSubscriptionModal
          subscription={deleteSubscription}
          onClose={(deleted?: boolean) => {
            setDeleteSubscription(undefined);
            if (deleted) {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.SUBSCRIPTION,
                source: EventTrackingSource.LIST_KEBAB,
                resourceStatus: deleteSubscription.phase ?? '',
                outcome: TrackingOutcome.submit,
              } satisfies MaaSResourceDeletedProperties);
              refresh();
            } else {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.SUBSCRIPTION,
                source: EventTrackingSource.LIST_KEBAB,
                resourceStatus: deleteSubscription.phase ?? '',
                outcome: TrackingOutcome.cancel,
              } satisfies MaaSResourceDeletedProperties);
            }
          }}
        />
      )}
    </>
  );
};

export default SubscriptionsTab;
