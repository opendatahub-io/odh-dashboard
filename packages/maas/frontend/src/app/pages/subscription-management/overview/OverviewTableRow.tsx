import * as React from 'react';
import { Button, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ActionsColumn, ExpandableRowContent, Tbody, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { URL_PREFIX } from '~/app/utilities/const';
import { ModelOverviewRow, overviewColumns } from './columns';
import ExpandedModelContent from './ExpandedModelContent';

type OverviewTableRowProps = {
  row: ModelOverviewRow;
  rowIndex: number;
};

const RETURN_TO = `${URL_PREFIX}/subscription-management/overview`;

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
    <Button variant="plain" data-testid="no-policies-warning">
      <ExclamationTriangleIcon color="orange" aria-label="No authorization policies warning" />
    </Button>
  </Popover>
);

const OverviewTableRow: React.FC<OverviewTableRowProps> = ({ row, rowIndex }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const navigate = useNavigate();

  return (
    <Tbody isExpanded={isExpanded} data-testid="overview-model-row">
      <Tr>
        <Td
          data-testid="expand-model"
          expand={{
            rowIndex,
            isExpanded,
            onToggle: () => setIsExpanded((prev) => !prev),
          }}
        />
        <Td dataLabel={overviewColumns[1].label}>
          <TableRowTitleDescription
            title={<span className="pf-v6-u-font-weight-bold">{row.displayName ?? row.name}</span>}
            subtitle={`${row.namespace}/${row.name}`}
            description={row.description}
            truncateDescriptionLines={2}
          />
        </Td>
        <Td dataLabel={overviewColumns[2].label}>{row.subscriptions.length}</Td>
        <Td dataLabel={overviewColumns[3].label}>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{row.policies.length}</FlexItem>
            {row.policies.length === 0 && (
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
                  navigate(`${URL_PREFIX}/subscription-management/subscriptions/create`, {
                    state: { returnTo: RETURN_TO },
                  }),
              },
              {
                title: 'Create authorization policy',
                onClick: () =>
                  navigate(`${URL_PREFIX}/subscription-management/auth-policies/create`, {
                    state: { returnTo: RETURN_TO },
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
              modelName={row.name}
              modelNamespace={row.namespace}
              subscriptions={row.subscriptions}
              policies={row.policies}
            />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default OverviewTableRow;
