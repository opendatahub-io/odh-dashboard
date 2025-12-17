import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, Stack, StackItem } from '@patternfly/react-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Tier } from '~/app/types/tier';
import { tierColumns } from './columns';

type TiersTableRowProps = {
  tier: Tier;
};

const TiersTableRow: React.FC<TiersTableRowProps> = ({ tier }) => {
  const navigate = useNavigate();

  return (
    <Tr>
      <Td dataLabel={tierColumns[0].label}>
        <TableRowTitleDescription
          title={<Link to={`/maas/tiers/view/${tier.name}`}>{tier.displayName}</Link>}
          description={tier.description}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={tierColumns[1].label}>
        <Label>{tier.level}</Label>
      </Td>
      <Td dataLabel={tierColumns[2].label}>
        <Label>
          {tier.groups.length} Group{tier.groups.length !== 1 ? 's' : ''}
        </Label>
      </Td>
      <Td dataLabel={tierColumns[3].label}>
        <Label>
          {tier.models.length} Model{tier.models.length !== 1 ? 's' : ''}
        </Label>
      </Td>
      <Td dataLabel={tierColumns[4].label}>
        <Stack>
          {tier.limits.tokensPerUnit.map((limit, index) => (
            <StackItem key={`token-${index}`}>
              {limit.count.toLocaleString()} tokens/{limit.time} {limit.unit}
            </StackItem>
          ))}
          {tier.limits.requestsPerUnit.map((limit, index) => (
            <StackItem key={`request-${index}`}>
              {limit.count.toLocaleString()} requests/{limit.time} {limit.unit}
            </StackItem>
          ))}
        </Stack>
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'View details',
              onClick: () => navigate(`/maas/tiers/view/${tier.name}`),
            },
            {
              title: 'Edit tier',
              onClick: () => navigate(`/maas/tiers/edit/${tier.name}`),
            },
            {
              title: 'Delete tier',
              // TODO: Add delete tier functionality
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default TiersTableRow;
