import * as React from 'react';
import { ResourceTr, ResourceNameTooltip } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Content } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { convertSubscriptionToK8sResource } from '~/app/utilities/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import ExpandedGroupsPanel from '~/app/shared/ExpandedGroupsPanel';
import ExpandedSubscriptionModelsPanel from '~/app/shared/ExpandedSubscriptionModelsPanel';
import { subscriptionsColumns } from './columns';

// Total column count: Name + Phase + Groups + Models + Priority + Actions
const SUBSCRIPTION_COL_SPAN = 6;

type ExpandedPanel = 'groups' | 'models' | null;

type SubscriptionTableRowProps = {
  subscription: MaaSSubscription;
  rowIndex: number;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
  returnTo?: string;
};

const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  subscription,
  rowIndex,
  setDeleteSubscription,
  returnTo,
}) => {
  const navigate = useNavigate();
  const base = returnTo ?? `${URL_PREFIX}/subscriptions`;
  const navState = returnTo ? { state: { returnTo } } : undefined;
  const [expandedPanel, setExpandedPanel] = React.useState<ExpandedPanel>(null);

  const togglePanel = (panel: 'groups' | 'models') => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  const onViewDetailsSubscription = (subscriptionName: string) => {
    navigate(`${base}/view/${subscriptionName}`, navState);
  };
  const onEditSubscription = (subscriptionName: string) => {
    navigate(`${base}/edit/${subscriptionName}`, navState);
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

  const groupsCount = subscription.owner.groups.length;
  const modelsCount = subscription.modelRefs.length;
  const isRowExpanded = expandedPanel !== null;

  return (
    <Tbody isExpanded={isRowExpanded}>
      <ResourceTr resource={subscriptionResource} isContentExpanded={isRowExpanded} isControlRow>
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
        <Td
          dataLabel={subscriptionsColumns[2].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'groups',
            onToggle: () => togglePanel('groups'),
            expandId: `expand-${subscription.name}-groups`,
            rowIndex,
            columnIndex: 2,
          }}
          data-testid="subscription-groups-expand-btn"
        >
          {groupsCount}
        </Td>
        <Td
          dataLabel={subscriptionsColumns[3].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'models',
            onToggle: () => togglePanel('models'),
            expandId: `expand-${subscription.name}-models`,
            rowIndex,
            columnIndex: 3,
          }}
          data-testid="subscription-models-expand-btn"
        >
          {modelsCount}
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
                onClick: () => setDeleteSubscription(subscription),
              },
            ]}
          />
        </Td>
      </ResourceTr>
      <Tr isExpanded={expandedPanel === 'groups'}>
        <Td dataLabel="Groups" colSpan={SUBSCRIPTION_COL_SPAN}>
          <ExpandableRowContent>
            <ExpandedGroupsPanel
              groups={subscription.owner.groups}
              testId="subscription-groups-expanded-panel"
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
      <Tr isExpanded={expandedPanel === 'models'}>
        <Td dataLabel="Models" colSpan={SUBSCRIPTION_COL_SPAN}>
          <ExpandableRowContent>
            <ExpandedSubscriptionModelsPanel
              models={subscription.modelRefs}
              testId="subscription-models-expanded-panel"
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default SubscriptionTableRow;
