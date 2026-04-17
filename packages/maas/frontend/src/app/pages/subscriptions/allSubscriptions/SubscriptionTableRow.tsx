import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Content, Label } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import PhaseLabel from '~/app/shared/PhaseLabel';
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
              {subscription.displayName ?? subscription.name}
            </Link>
          }
          description={subscription.description ?? ''}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={subscriptionsColumns[1].label}>
        <PhaseLabel phase={subscription.phase} statusMessage={subscription.statusMessage} />
      </Td>
      <Td dataLabel={subscriptionsColumns[2].label}>
        <Label color="grey">{`${subscription.owner.groups.length} Group${subscription.owner.groups.length === 1 ? '' : 's'}`}</Label>
      </Td>
      <Td dataLabel={subscriptionsColumns[3].label}>
        <Label color="grey">{`${subscription.modelRefs.length} Model${subscription.modelRefs.length === 1 ? '' : 's'}`}</Label>
      </Td>
      <Td dataLabel={subscriptionsColumns[4].label} style={{ textAlign: 'center' }}>
        <Content component="p" style={{ fontWeight: 'bold' }}>
          {subscription.priority ?? '-'}
        </Content>
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
