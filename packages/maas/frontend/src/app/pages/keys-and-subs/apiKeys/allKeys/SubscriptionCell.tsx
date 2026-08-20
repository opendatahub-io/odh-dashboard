import * as React from 'react';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { URL_PREFIX } from '~/app/utilities/const';
import { SubscriptionDetail } from '~/app/types/api-key';
import {
  MaaSEvents,
  MySubscriptionsGrouping,
  SubscriptionDetailNavLocation,
  SubscriptionDetailNavigatedProperties,
} from '~/app/types/event-tracking';

type SubscriptionCellProps = {
  subscriptionName?: string;
  subscriptionDetail?: SubscriptionDetail;
};

const SubscriptionCell: React.FC<SubscriptionCellProps> = ({
  subscriptionName,
  subscriptionDetail,
}) => {
  if (!subscriptionName) {
    return <>—</>;
  }

  const displayLabel = subscriptionDetail?.displayName || subscriptionName;

  // Only link to the details page when the subscription still exists (detail is present).
  // If subscriptionDetail is undefined the subscription may have been deleted, so show
  // plain text to avoid navigating to a page that no longer exists.
  if (!subscriptionDetail) {
    return <span data-testid="api-key-subscription">{displayLabel}</span>;
  }

  return (
    <Link
      to={`${URL_PREFIX}/keys-and-subs/subscriptions/${encodeURIComponent(subscriptionName)}`}
      data-testid="subscription-detail-link"
      onClick={() => {
        fireMiscTrackingEvent(MaaSEvents.MY_SUBSCRIPTIONS_DETAIL_NAVIGATED, {
          currentView: MySubscriptionsGrouping.SUBSCRIPTION,
          location: SubscriptionDetailNavLocation.API_KEYS_TABLE,
        } satisfies SubscriptionDetailNavigatedProperties);
      }}
    >
      <span data-testid="api-key-subscription">{displayLabel}</span>
    </Link>
  );
};

export default SubscriptionCell;
