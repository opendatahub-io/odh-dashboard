import * as React from 'react';
import { Button, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ActionsColumn, ExpandableRowContent, Tbody, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
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
    headerContent="Configuration warning"
    bodyContent={
      <div>
        <p>
          This model has no subscriptions. Without a subscription, no token rate limits are
          configured and the model cannot be called through the MaaS API gateway.
        </p>
        <p className="pf-v6-u-mt-sm">
          <strong>How to fix this:</strong>
        </p>
        <p className="pf-v6-u-ml-md">
          Create a new subscription that includes this model and at least one group.
        </p>
        <p className="pf-v6-u-ml-md">
          Or add this model to an existing subscription from the Subscriptions tab.
        </p>
      </div>
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
    headerContent="Configuration warning"
    bodyContent={
      <div>
        <p>
          This model has no authorization policies. Without a policy, the MaaS gateway will deny all
          access to this model -- even if a subscription exists.
        </p>
        <p className="pf-v6-u-mt-sm">
          <strong>How to fix this:</strong>
        </p>
        <p className="pf-v6-u-ml-md">
          Create a new authorization policy that includes this model and at least one group.
        </p>
        <p className="pf-v6-u-ml-md">
          Or add this model to an existing policy from the Authorization policies tab.
        </p>
        <p className="pf-v6-u-mt-sm">
          <em>Both a subscription and a policy are required for a group to access a model.</em>
        </p>
      </div>
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
    <Tbody isExpanded={isExpanded} data-testid="overview-model-row">
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
        <Td dataLabel={overviewColumns[2].label}>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{row.subscriptions.length}</FlexItem>
            {row.subscriptions.length === 0 && (
              <FlexItem>
                <NoSubscriptionsWarning />
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td dataLabel={overviewColumns[3].label}>
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
                      preSelectedModel: { name: row.id },
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
                      preSelectedModel: { name: row.id },
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
            <ExpandedModelContent subscriptions={row.subscriptions} policies={row.authPolicies} />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default OverviewTableRow;
