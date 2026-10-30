import * as React from 'react';
import { ResourceTr, ResourceNameTooltip } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Link, useNavigate } from 'react-router-dom';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSSubscription } from '~/app/types/subscriptions';
import {
  getSubscriptionEditUrl,
  getSubscriptionViewUrl,
} from '~/app/utilities/maasGovernanceNavigation';
import { convertSubscriptionToK8sResource } from '~/app/utilities/subscriptions';
import { useSubscriptionAffectedModels } from '~/app/hooks/useGovernanceAffectedModels';
import PhaseLabel from '~/app/shared/Phase/PhaseLabel';
import {
  convertStringToPhaseStatus,
  PhaseLabelLocation,
  PhaseResourceType,
} from '~/app/utilities/phaseLabelUtils';
import ExpandedGroupsPanel from '~/app/shared/ExpandedGroupsPanel';
import CompoundExpandCountCell from '~/app/shared/CompoundExpandCountCell';
import ExpandedModelsPanel from '~/app/shared/ExpandedModelsPanel';
import {
  EventTrackingExpandedSection,
  EventTrackingPopoverType,
  EventTrackingResourceType,
  EventTrackingSource,
  convertStringToPopoverViewedStatus,
  EventTrackingEditSource,
  MaaSEvents,
  MaaSSettingsDetailsViewedProperties,
  MaaSSettingsListRowExpandedProperties,
  MaaSGovernanceStatusPopoverViewedProperties,
} from '~/app/types/event-tracking';
import {
  subscriptionsColumns,
  getSubscriptionsColumns,
  GROUP_COLUMN_FIELD,
  MODEL_COLUMN_FIELD,
} from './columns';

type ExpandedPanel = 'groups' | 'models' | null;

type SubscriptionTableRowProps = {
  subscription: MaaSSubscription;
  rowIndex: number;
  setDeleteSubscription: (subscription: MaaSSubscription) => void;
  returnTo?: string;
  /** Read-only viewers omit the Status column. Defaults to true. */
  showStatus?: boolean;
  /** Read-only viewers omit the kebab (row actions) column. Defaults to true. */
  showActions?: boolean;
  /** Overrides the subscription name link target. Defaults to the governance view page. */
  getSubscriptionDetailUrl?: (name: string) => string;
};

const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  subscription,
  rowIndex,
  setDeleteSubscription,
  returnTo,
  showStatus = true,
  showActions = true,
  getSubscriptionDetailUrl = getSubscriptionViewUrl,
}) => {
  const columns = getSubscriptionsColumns({ showStatus });
  const groupsColumnIndex = columns.findIndex((col) => col.field === GROUP_COLUMN_FIELD);
  const modelsColumnIndex = columns.findIndex((col) => col.field === MODEL_COLUMN_FIELD);
  const columnSpan = columns.length + (showActions ? 1 : 0);
  const navigate = useNavigate();
  const navState = {
    state: {
      ...(returnTo ? { returnTo } : {}),
      editSource: EventTrackingEditSource.LIST_KEBAB,
    },
  };
  const [expandedPanel, setExpandedPanel] = React.useState<ExpandedPanel>(null);
  const { affectedModels, overviewLoaded } = useSubscriptionAffectedModels(subscription);

  const togglePanel = (panel: 'groups' | 'models') => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  const onViewDetailsSubscription = (subscriptionName: string) => {
    fireMiscTrackingEvent(MaaSEvents.MAAS_RESOURCE_DETAILS_VIEWED, {
      resourceType: EventTrackingResourceType.SUBSCRIPTION,
      source: EventTrackingSource.TAB_KEBAB,
      resourceStatus: subscription.phase ?? '',
    } satisfies MaaSSettingsDetailsViewedProperties);
    navigate(getSubscriptionViewUrl(subscriptionName), navState);
  };
  const onEditSubscription = (subscriptionName: string) => {
    navigate(getSubscriptionEditUrl(subscriptionName), navState);
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
    <Td dataLabel={columns[0].label}>
      <TableRowTitleDescription
        title={
          subscription.deletionTimestamp ? (
            <span data-testid="subscription-name">
              {subscription.displayName ?? subscription.name}
            </span>
          ) : (
            <ResourceNameTooltip resource={convertSubscriptionToK8sResource(subscription)}>
              <Link
                to={getSubscriptionDetailUrl(subscription.name)}
                state={returnTo ? { returnTo } : undefined}
                onClick={() =>
                  fireMiscTrackingEvent(MaaSEvents.MAAS_RESOURCE_DETAILS_VIEWED, {
                    resourceType: EventTrackingResourceType.SUBSCRIPTION,
                    source: EventTrackingSource.TAB_LINK,
                    resourceStatus: subscription.phase ?? '',
                  } satisfies MaaSSettingsDetailsViewedProperties)
                }
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
        reason={subscription.reason}
        status={subscription.status}
        conditionType={subscription.conditionType}
        lastTransitionTime={subscription.lastTransitionTime}
        resourceType={PhaseResourceType.SUBSCRIPTION}
        resourceName={subscription.displayName ?? subscription.name}
        affectedModels={affectedModels}
        overviewLoaded={overviewLoaded}
        resourceUrl={getSubscriptionViewUrl(subscription.name)}
        returnTo={returnTo}
        onClick={() => {
          fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_STATUS_POPOVER_VIEWED, {
            popoverType: EventTrackingPopoverType.STATUS,
            status: convertStringToPopoverViewedStatus(subscription.phase),
            location: PhaseLabelLocation.SUBSCRIPTIONS_TAB,
          } satisfies MaaSGovernanceStatusPopoverViewedProperties);
        }}
      />
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
        {showStatus && phaseCell}
        <Td
          dataLabel={columns[groupsColumnIndex].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'groups',
            onToggle: () => {
              togglePanel('groups');
              // So it doesn't fire on open and close of the expanded section
              if (expandedPanel !== 'groups') {
                fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_ROW_EXPANDED, {
                  resourceType: EventTrackingResourceType.SUBSCRIPTION,
                  expandedSection: EventTrackingExpandedSection.GROUPS,
                  resourceStatus: convertStringToPhaseStatus(subscription.phase ?? ''),
                  modelCount: modelsCount,
                  groupCount: groupsCount,
                } satisfies MaaSSettingsListRowExpandedProperties);
              }
            },
            expandId: `expand-${subscription.name}-groups`,
            rowIndex,
            columnIndex: groupsColumnIndex,
          }}
          data-testid="subscription-groups-expand-btn"
        >
          <CompoundExpandCountCell count={groupsCount} />
        </Td>
        <Td
          dataLabel={columns[modelsColumnIndex].label}
          compoundExpand={{
            isExpanded: expandedPanel === 'models',
            onToggle: () => {
              togglePanel('models');
              // So it doesn't fire on open and close of the expanded section
              if (expandedPanel !== 'models') {
                fireMiscTrackingEvent(MaaSEvents.MAAS_SETTINGS_LIST_ROW_EXPANDED, {
                  resourceType: EventTrackingResourceType.SUBSCRIPTION,
                  expandedSection: EventTrackingExpandedSection.MODELS,
                  resourceStatus: convertStringToPhaseStatus(subscription.phase ?? ''),
                  modelCount: modelsCount,
                  groupCount: groupsCount,
                } satisfies MaaSSettingsListRowExpandedProperties);
              }
            },
            expandId: `expand-${subscription.name}-models`,
            rowIndex,
            columnIndex: modelsColumnIndex,
          }}
          data-testid="subscription-models-expand-btn"
        >
          <CompoundExpandCountCell count={modelsCount} />
        </Td>
        {showActions && actionsCell}
      </ResourceTr>
      <Tr isExpanded={expandedPanel === 'groups'}>
        <Td colSpan={columnSpan}>
          <ExpandableRowContent>
            <ExpandedGroupsPanel groups={groups} />
          </ExpandableRowContent>
        </Td>
      </Tr>
      <Tr isExpanded={expandedPanel === 'models'}>
        <Td colSpan={columnSpan}>
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
