import * as React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import { TableComposable, Th, Thead, Tr } from '@patternfly/react-table';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { tokenColumns } from '~/pages/modelServing/screens/global/data';
import { GetColumnSort } from '~/utilities/useTableColumnSort';
import ServingRuntimeTokenTableRow from './ServingRuntimeTokenTableRow';

type ServingRumtimeTokensTableProps = {
  getColumnSort: GetColumnSort;
  isTokenEnabled: boolean;
};

const ServingRumtimeTokensTable: React.FC<ServingRumtimeTokensTableProps> = ({
  getColumnSort,
  isTokenEnabled,
}) => {
  const {
    serverSecrets: { data: secrets, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  if (!isTokenEnabled) {
    return (
      <HelperText>
        <HelperTextItem variant="warning" hasIcon>
          Tokens disabled
        </HelperTextItem>
      </HelperText>
    );
  }

  return (
    <TableComposable variant={'compact'}>
      <Thead>
        <Tr>
          {tokenColumns.map((col, i) => (
            <Th key={col.field} sort={getColumnSort(i)} width={col.width}>
              {col.label}
            </Th>
          ))}
        </Tr>
      </Thead>
      {secrets.map((secret) => (
        <ServingRuntimeTokenTableRow
          key={secret.metadata.uid}
          obj={secret}
          loaded={loaded}
          error={error}
        />
      ))}
    </TableComposable>
  );
};

export default ServingRumtimeTokensTable;
