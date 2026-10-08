import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { URL_PREFIX } from '~/app/utilities/const';
import { getSubscriptionViewUrl } from '~/app/utilities/maasGovernanceNavigation';
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
  /**
   * Only link when the viewer can open this subscription (My Subscriptions).
   * Without access, show plain text.
   */
  linkable?: boolean;
  /** Admins  get a secondary link to the MaaS governance subscription view. */
  isMaasAdmin?: boolean;
};

const SubscriptionCell: React.FC<SubscriptionCellProps> = ({
  subscriptionName,
  subscriptionDetail,
  linkable = false,
  isMaasAdmin = false,
}) => {
  if (!subscriptionName) {
    return <>—</>;
  }

  const displayLabel = subscriptionDetail?.displayName || subscriptionName;
  const showGovernanceLink = isMaasAdmin && !!subscriptionDetail;

  const nameContent = linkable ? (
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
  ) : (
    <span data-testid="api-key-subscription">{displayLabel}</span>
  );

  if (!showGovernanceLink) {
    return nameContent;
  }

  return (
    <Stack>
      <StackItem>{nameContent}</StackItem>
      <StackItem>
        <Link
          to={getSubscriptionViewUrl(subscriptionName)}
          data-testid="subscription-governance-link"
          className="pf-v6-u-font-size-sm"
        >
          View in MaaS governance
        </Link>
      </StackItem>
    </Stack>
  );
};

export default SubscriptionCell;
