import * as React from 'react';
import { ResourceTr, ResourceNameTooltip } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Content, ContentVariants } from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { convertSubscriptionToK8sResource } from '~/app/utilities/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import ExpandedGroupsPanel from '~/app/shared/ExpandedGroupsPanel';
import CompoundExpandCountCell from '~/app/shared/CompoundExpandCountCell';
import ExpandedModelsPanel from '~/app/shared/ExpandedModelsPanel';
import { subscriptionsColumns } from './columns';

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

  const groupsCount = Array.isArray(subscription.owner.groups)
    ? subscription.owner.groups.length
    : 0;
  const modelsCount = subscription.modelRefs.length;
  const groups = Array.isArray(subscription.owner.groups) ? subscription.owner.groups : [];

  const nameCell = (
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
  );

  const phaseCell = (
    <Td dataLabel={subscriptionsColumns[1].label}>
      <PhaseLabel
        phase={subscription.phase}
        statusMessage={subscription.statusMessage}
        resourceType={PhaseResourceType.SUBSCRIPTION}
      />
    </Td>
  );

  const priorityCell = (
    <Td dataLabel={subscriptionsColumns[4].label}>
      <Content
        component={ContentVariants.p}
        className="pf-v6-u-font-weight-bold pf-v6-u-text-align-center"
      >
        {subscription.priority ?? '-'}
      </Content>
    </Td>
  );

  const actionsCell = (
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
  );

  const isRowExpanded = expandedPanel !== null;

  return (
    <Tbody isExpanded={isRowExpanded}>
      <ResourceTr
        resource={subscriptionResource}
        isContentExpanded={isRowExpanded}
        isControlRow
        data-testid="subscription-row"
      >
        {nameCell}
        {phaseCell}
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
          <CompoundExpandCountCell count={groupsCount} />
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
          <CompoundExpandCountCell count={modelsCount} />
        </Td>
        {priorityCell}
        {actionsCell}
      </ResourceTr>
      <Tr isExpanded={expandedPanel === 'groups'}>
        <Td colSpan={subscriptionsColumns.length + 1}>
          <ExpandableRowContent>
            <ExpandedGroupsPanel groups={groups} />
          </ExpandableRowContent>
        </Td>
      </Tr>
      <Tr isExpanded={expandedPanel === 'models'}>
        <Td colSpan={subscriptionsColumns.length + 1}>
          <ExpandableRowContent>
            <ExpandedModelsPanel
              models={subscription.modelRefs}
              testIdResource="subscription"
              showTokenLimits
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default SubscriptionTableRow;
