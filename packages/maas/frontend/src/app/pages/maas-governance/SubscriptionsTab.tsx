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
  MODEL_TEXT_FILTER_PREFIX,
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
  SubscriptionsFilterSelection,
} from '~/app/pages/subscriptions/allSubscriptions/const';
import DeleteSubscriptionModal from '~/app/pages/subscriptions/DeleteSubscriptionModal';
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
    const subscriptionText = asFilterSelection(
      filterData[SubscriptionsFilterOptions.subscription],
    )?.value.toLowerCase();
    const groupFilter = asFilterSelection(filterData[SubscriptionsFilterOptions.group]);
    const modelFilter = asFilterSelection(filterData[SubscriptionsFilterOptions.model]);
    const modelText = modelFilter?.value.startsWith(MODEL_TEXT_FILTER_PREFIX)
      ? modelFilter.value.slice(MODEL_TEXT_FILTER_PREFIX.length).toLowerCase()
      : undefined;

    if (!subscriptionText && !groupFilter && !modelFilter) {
      return subscriptions;
    }

    return subscriptions.filter((subscription) => {
      if (
        subscriptionText &&
        ![
          subscription.name,
          subscription.displayName,
          subscription.description,
          ...subscription.owner.groups.map((group) => group.name),
          ...subscription.modelRefs.flatMap((ref) => [ref.name, ref.displayName]),
        ].some((text) => text?.toLowerCase().includes(subscriptionText))
      ) {
        return false;
      }
      if (
        groupFilter &&
        !subscription.owner.groups.some((group) => group.name === groupFilter.value)
      ) {
        return false;
      }
      if (
        modelFilter &&
        !subscription.modelRefs.some((ref) =>
          modelText !== undefined
            ? ref.name.toLowerCase().includes(modelText) ||
              ref.displayName?.toLowerCase().includes(modelText)
            : ref.name === modelFilter.value,
        )
      ) {
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
              <SubscriptionsToolbar
                filterData={filterData}
                onFilterUpdate={onFilterUpdate}
                subscriptions={subscriptions}
                returnTo={returnTo}
                showCreateButton={!readOnly}
                testIdPrefix={readOnly ? 'model-access' : 'subscriptions'}
              />
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
