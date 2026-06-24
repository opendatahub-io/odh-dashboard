import * as React from 'react';
import { ActionsColumn, Td } from '@patternfly/react-table';
import { ResourceTr, ResourceNameTooltip } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Content, Label } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { convertSubscriptionToK8sResource } from '~/app/utilities/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { subscriptionsColumns } from './columns';

type SubscriptionTableRowProps = {
  subscription: MaaSSubscription;
  key: string;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
  returnTo?: string;
};

const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  subscription,
  key,
  setDeleteSubscription,
  returnTo,
}) => {
  const navigate = useNavigate();
  const base = returnTo ?? `${URL_PREFIX}/subscriptions`;
  const navState = returnTo ? { state: { returnTo } } : undefined;

  const onViewDetailsSubscription = (subscriptionName: string) => {
    navigate(`${base}/view/${subscriptionName}`, navState);
  };
  const onEditSubscription = (subscriptionName: string) => {
    navigate(`${base}/edit/${subscriptionName}`, navState);
  };
  const onDeleteSubscription = (subscriptionToDelete: MaaSSubscription) => {
    setDeleteSubscription(subscriptionToDelete);
  };

  const subscriptionResource: K8sResourceCommon = {
    apiVersion: 'maas.opendatahub.io/v1alpha1',
    kind: 'MaaSSubscription',
    metadata: {
      name: subscription.name,
      namespace: subscription.namespace,
      ...(subscription.deletionTimestamp
        ? { deletionTimestamp: subscription.deletionTimestamp }
        : {}),
    },
  };
  return (
    <ResourceTr resource={subscriptionResource} key={key}>
      <Td dataLabel={subscriptionsColumns[0].label}>
        <TableRowTitleDescription
          title={
            subscription.deletionTimestamp ? (
              <span data-testid="subscription-name">
                {subscription.displayName ?? subscription.name}
              </span>
            ) : (
              <ResourceNameTooltip resource={convertSubscriptionToK8sResource(subscription)}>
                <Link
                  to={`${base}/view/${subscription.name}`}
                  state={returnTo ? { returnTo } : undefined}
                >
                  {subscription.displayName ?? subscription.name}
                </Link>
              </ResourceNameTooltip>
            )
          }
          description={subscription.description ?? ''}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={subscriptionsColumns[1].label}>
        <PhaseLabel
          phase={subscription.phase}
          statusMessage={subscription.statusMessage}
          resourceType={PhaseResourceType.SUBSCRIPTION}
        />
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
          isDisabled={!!subscription.deletionTimestamp}
          items={[
            {
              title: 'View details',
              onClick: () => onViewDetailsSubscription(subscription.name),
            },
            {
              title: 'Edit',
              onClick: () => onEditSubscription(subscription.name),
            },
            { isSeparator: true },
            {
              title: 'Delete',
              onClick: () => onDeleteSubscription(subscription),
            },
          ]}
        />
      </Td>
    </ResourceTr>
  );
};

export default SubscriptionTableRow;
