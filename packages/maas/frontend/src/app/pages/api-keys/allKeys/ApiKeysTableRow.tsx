import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { capitalize, Label } from '@patternfly/react-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey } from '~/app/types/api-key';
import { apiKeyColumns } from './columns';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type ApiKeysTableRowProps = {
  apiKey: APIKey;
};

const ApiKeysTableRow: React.FC<ApiKeysTableRowProps> = ({ apiKey }) => (
  <Tr>
    <Td dataLabel={apiKeyColumns[0].label}>
      <TableRowTitleDescription
        title={apiKey.name}
        description={apiKey.description}
        truncateDescriptionLines={2}
      />
    </Td>
    <Td dataLabel={apiKeyColumns[1].label}>
      <Label color={apiKey.status === 'active' ? 'green' : 'red'}>
        {capitalize(apiKey.status)}
      </Label>
    </Td>
    <Td dataLabel={apiKeyColumns[2].label}>{formatDate(apiKey.creationDate)}</Td>
    <Td dataLabel={apiKeyColumns[3].label}>{formatDate(apiKey.expirationDate)}</Td>
  </Tr>
);

export default ApiKeysTableRow;
