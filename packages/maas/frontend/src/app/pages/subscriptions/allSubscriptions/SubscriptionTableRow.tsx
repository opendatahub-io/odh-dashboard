import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Label } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { subscriptionsColumns } from './columns';

type SubscriptionTableRowProps = {
  subscription: MaaSSubscription;
  key: string;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
};

const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  subscription,
  key,
  setDeleteSubscription,
}) => {
  const navigate = useNavigate();

  const onViewDetailsSubscription = (subscriptionName: string) => {
    navigate(`${URL_PREFIX}/subscriptions/view/${subscriptionName}`);
  };
  const onEditSubscription = (subscriptionName: string) => {
    navigate(`${URL_PREFIX}/subscriptions/edit/${subscriptionName}`);
  };
  const onDeleteSubscription = (subscriptionToDelete: MaaSSubscription) => {
    setDeleteSubscription(subscriptionToDelete);
  };

  return (
    <Tr key={key}>
      <Td dataLabel={subscriptionsColumns[0].label}>
        <TableRowTitleDescription
          title={
            <Link to={`${URL_PREFIX}/subscriptions/view/${subscription.name}`}>
              {subscription.name}
            </Link>
          }
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={subscriptionsColumns[1].label}>
        <Label color="grey">{`${subscription.owner.groups.length.toString()} Groups`}</Label>
      </Td>
      <Td dataLabel={subscriptionsColumns[2].label}>
        <Label color="grey">{`${subscription.modelRefs.length.toString()} Models`}</Label>
      </Td>
      <Td isActionCell>
        <ActionsColumn
          data-testid="subscription-actions"
          items={[
            {
              title: 'View details',
              onClick: () => onViewDetailsSubscription(subscription.name),
            },
            {
              title: 'Edit subscription',
              onClick: () => onEditSubscription(subscription.name),
            },
            {
              title: 'Delete subscription',
              onClick: () => onDeleteSubscription(subscription),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default SubscriptionTableRow;
