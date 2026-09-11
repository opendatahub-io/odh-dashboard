import * as React from 'react';
import { Button, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ActionsColumn, ExpandableRowContent, Tbody, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { PhaseLabelLocation, PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import PhaseLabel from '~/app/shared/Phase/PhaseLabel';
import {
  convertStringToPopoverViewedStatus,
  EventTrackingPopoverType,
  MaaSEvents,
  MaaSGovernanceStatusPopoverViewedProperties,
} from '~/app/types/event-tracking';
import { overviewColumns } from './utils';
import ExpandedModelContent from './ExpandedModelContent';

type OverviewTableRowProps = {
  row: ModelOverviewItem;
  rowIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const RETURN_TO = `${URL_PREFIX}/maas-governance/overview`;

const NoSubscriptionsWarning: React.FC = () => (
  <Popover
    data-testid="no-subscriptions-warning-popover"
    onShow={() => {
      fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_STATUS_POPOVER_VIEWED, {
        popoverType: EventTrackingPopoverType.WARNING,
        status: 'configuration-warning',
        location: PhaseLabelLocation.OVERVIEW,
      } satisfies MaaSGovernanceStatusPopoverViewedProperties);
    }}
    headerContent="No subscriptions"
    bodyContent={
      <p>
        This model cannot be called through the MaaS API gateway because it is not included in any
        subscriptions. Create a subscription that includes this model and at least 1 group, or add
        this model to an existing subscription from the <b>Subscriptions</b> tab.
      </p>
    }
  >
    <Button
      variant="plain"
      data-testid="no-subscriptions-warning"
      aria-label="No subscriptions warning"
    >
      <ExclamationTriangleIcon color="orange" />
    </Button>
  </Popover>
);

const NoPoliciesWarning: React.FC = () => (
  <Popover
    data-testid="no-policies-warning-popover"
    onShow={() => {
      fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_STATUS_POPOVER_VIEWED, {
        popoverType: EventTrackingPopoverType.WARNING,
        status: 'configuration-warning',
        location: PhaseLabelLocation.OVERVIEW,
      } satisfies MaaSGovernanceStatusPopoverViewedProperties);
    }}
    headerContent="No authorization policies"
    bodyContent={
      <p>
        This model cannot be called through the MaaS API gateway because it does not have an
        authorization policy. Both a subscription and a policy are required for a group to access a
        model. Create a policy that includes this model and at least 1 group, or add this model to
        an existing policy from the <b>Authorization policies</b> tab.
      </p>
    }
  >
    <Button
      variant="plain"
      data-testid="no-policies-warning"
      aria-label="No authorization policies warning"
    >
      <ExclamationTriangleIcon color="orange" />
    </Button>
  </Popover>
);

const OverviewTableRow: React.FC<OverviewTableRowProps> = ({
  row,
  rowIndex,
  isExpanded,
  onToggleExpand,
}) => {
  const navigate = useNavigate();

  return (
    <Tbody isExpanded={isExpanded} data-testid={`overview-model-row-${row.id}-${row.namespace}`}>
      <Tr style={isExpanded ? { borderBottom: 'none' } : undefined}>
        <Td
          data-testid="expand-model"
          expand={{
            rowIndex,
            isExpanded,
            onToggle: onToggleExpand,
          }}
        />
        <Td dataLabel={overviewColumns[1].label}>
          <TableRowTitleDescription
            title={
              <span className="pf-v6-u-font-weight-bold">
                {row.modelDetails.displayName ?? row.id}
              </span>
            }
            subtitle={row.id}
            description={row.modelDetails.description}
            truncateDescriptionLines={2}
          />
        </Td>
        <Td dataLabel={overviewColumns[2].label}>{row.namespace}</Td>
        <Td dataLabel={overviewColumns[3].label}>
          <PhaseLabel
            phase={row.modelDetails.phase}
            statusMessage={row.modelDetails.statusMessage}
            status={row.modelDetails.status}
            conditionType={row.modelDetails.conditionType}
            lastTransitionTime={row.modelDetails.lastTransitionTime}
            reason={row.modelDetails.reason}
            resourceType={PhaseResourceType.MODEL}
            resourceName={row.modelDetails.displayName ?? row.id}
            onClick={() => {
              fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_STATUS_POPOVER_VIEWED, {
                popoverType: EventTrackingPopoverType.STATUS,
                status: convertStringToPopoverViewedStatus(row.modelDetails.phase),
                location: PhaseLabelLocation.OVERVIEW,
              } satisfies MaaSGovernanceStatusPopoverViewedProperties);
            }}
          />
        </Td>
        <Td dataLabel={overviewColumns[4].label}>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{row.subscriptions.length}</FlexItem>
            {row.subscriptions.length === 0 && (
              <FlexItem>
                <NoSubscriptionsWarning />
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td dataLabel={overviewColumns[5].label}>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{row.authPolicies.length}</FlexItem>
            {row.authPolicies.length === 0 && (
              <FlexItem>
                <NoPoliciesWarning />
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td isActionCell>
          <ActionsColumn
            data-testid="overview-model-actions"
            items={[
              {
                title: 'Create subscription',
                onClick: () =>
                  navigate(`${URL_PREFIX}/maas-governance/subscriptions/create`, {
                    state: {
                      returnTo: RETURN_TO,
                      breadcrumbLabel: 'MaaS governance',
                      preSelectedModel: { name: row.id, namespace: row.namespace },
                    },
                  }),
              },
              {
                title: 'Create authorization policy',
                onClick: () =>
                  navigate(`${URL_PREFIX}/maas-governance/auth-policies/create`, {
                    state: {
                      returnTo: RETURN_TO,
                      breadcrumbLabel: 'MaaS governance',
                      preSelectedModel: { name: row.id, namespace: row.namespace },
                    },
                  }),
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={overviewColumns.length}>
          <ExpandableRowContent>
            <ExpandedModelContent
              subscriptions={row.subscriptions}
              policies={row.authPolicies}
              returnTo={RETURN_TO}
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default OverviewTableRow;
