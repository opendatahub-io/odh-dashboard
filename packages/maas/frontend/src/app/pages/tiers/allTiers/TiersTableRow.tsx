import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, Stack, StackItem } from '@patternfly/react-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { RateLimit, Tier } from '~/app/types/tier';
import { tierColumns } from './columns';

const pluralize = (count: number, singular: string): string =>
  count === 1 ? singular : `${singular}s`;

const formatRateLimit = (limit: RateLimit, type: 'token' | 'request'): string =>
  `${limit.count.toLocaleString()} ${pluralize(limit.count, type)}/${limit.time} ${pluralize(limit.time, limit.unit)}`;

type TiersTableRowProps = {
  tier: Tier;
  onDeleteTier: (tier: Tier) => void;
};

const TiersTableRow: React.FC<TiersTableRowProps> = ({ tier, onDeleteTier }) => {
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
        <Label>{tier.level ?? 0}</Label>
      </Td>
      <Td dataLabel={tierColumns[2].label}>
        <Label>
          {tier.groups?.length ?? 0} Group{tier.groups?.length !== 1 ? 's' : ''}
        </Label>
      </Td>
      <Td dataLabel={tierColumns[3].label}>
        <Stack>
          {tier.limits?.tokensPerUnit ? (
            <StackItem>
              {tier.limits.tokensPerUnit.map((limit, index) => (
                <StackItem key={`token-${index}`}>{formatRateLimit(limit, 'token')}</StackItem>
              ))}
            </StackItem>
          ) : (
            <StackItem>No token limits</StackItem>
          )}
          {tier.limits?.requestsPerUnit ? (
            <StackItem>
              {tier.limits.requestsPerUnit.map((limit, index) => (
                <StackItem key={`request-${index}`}>{formatRateLimit(limit, 'request')}</StackItem>
              ))}
            </StackItem>
          ) : (
            <StackItem>No request limits</StackItem>
          )}
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
              onClick: () => onDeleteTier(tier),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default TiersTableRow;
