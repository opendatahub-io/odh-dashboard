import * as React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import Table from '~/components/Table';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { tokenColumns } from '~/pages/modelServing/screens/global/data';
import { ServingRuntimeKind } from '~/k8sTypes';
import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';
import { filterTokens } from './utils';
import ServingRuntimeTokenTableRow from './ServingRuntimeTokenTableRow';

type ServingRumtimeTokensTableProps = {
  obj: ServingRuntimeKind;
  isTokenEnabled: boolean;
};

const ServingRumtimeTokensTable: React.FC<ServingRumtimeTokensTableProps> = ({
  obj,
  isTokenEnabled,
}) => {
  const {
    serverSecrets: { data: secrets, loaded, error },
    currentProject,
  } = React.useContext(ProjectDetailsContext);
  const { dashboardConfig } = useAppContext();
  const customServingRuntimesEnabled = featureFlagEnabled(
    dashboardConfig.spec.dashboardConfig.disableCustomServingRuntimes,
  );

  const tokens = filterTokens(
    secrets,
    obj.metadata.name,
    currentProject.metadata.name,
    customServingRuntimesEnabled,
  );

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
      data={tokens}
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
