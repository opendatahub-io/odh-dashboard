import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { getModelAccessSubscriptionViewUrl } from '~/app/pages/model-access/utils';
import { URL_PREFIX } from '~/app/utilities/const';
import { getSubscriptionViewUrl, isMaaSPortalHost } from '~/app/utilities/maasGovernanceNavigation';
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
  /** Admins get a secondary link to the subscription governance view. */
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
  const isPortalHost = isMaaSPortalHost();
  const governanceLink = isPortalHost
    ? getModelAccessSubscriptionViewUrl(subscriptionName)
    : getSubscriptionViewUrl(subscriptionName);
  const governanceLabel = isPortalHost ? 'View in Model access' : 'View in MaaS governance';

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
      <span data-testid="api-key-subscription" className="pf-v6-u-font-weight-bold">
        {displayLabel}
      </span>
    </Link>
  ) : (
    <span data-testid="api-key-subscription" className="pf-v6-u-font-weight-bold">
      {displayLabel}
    </span>
  );

  if (!showGovernanceLink) {
    return nameContent;
  }

  return (
    <Stack>
      <StackItem>{nameContent}</StackItem>
      <StackItem>
        <Link
          to={governanceLink}
          data-testid="subscription-governance-link"
          className="pf-v6-u-font-size-sm"
        >
          {governanceLabel}
        </Link>
      </StackItem>
    </Stack>
  );
};

export default SubscriptionCell;
