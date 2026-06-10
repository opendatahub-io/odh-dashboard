import * as React from 'react';
import { Link } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { SubscriptionDetail } from '~/app/types/api-key';

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
    return <>{displayLabel}</>;
  }

  return (
    <Link
      to={`${URL_PREFIX}/keys-and-subs/subscriptions/${encodeURIComponent(subscriptionName)}`}
      data-testid="subscription-detail-link"
    >
      {displayLabel}
    </Link>
  );
};

export default SubscriptionCell;
