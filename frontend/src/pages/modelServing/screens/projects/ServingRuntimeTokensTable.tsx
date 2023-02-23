import * as React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import Table from '~/components/Table';

import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { tokenColumns } from '~/pages/modelServing/screens/global/data';
import ServingRuntimeTokenTableRow from './ServingRuntimeTokenTableRow';

type ServingRumtimeTokensTableProps = {
  isTokenEnabled: boolean;
};

const ServingRumtimeTokensTable: React.FC<ServingRumtimeTokensTableProps> = ({
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
    <Table
      data={secrets}
      columns={tokenColumns}
      rowRenderer={(secret) => (
        <ServingRuntimeTokenTableRow
          key={secret.metadata.uid}
          obj={secret}
          loaded={loaded}
          error={error}
        />
      )}
    />
  );
};

export default ServingRumtimeTokensTable;
