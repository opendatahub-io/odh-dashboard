import * as React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import { Table } from '~/components/table';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { tokenColumns } from '~/pages/modelServing/screens/global/data';
import { InferenceServiceKind, isInferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import ServingRuntimeTokenTableRow from '~/pages/modelServing/screens/projects/ModelMeshSection/ServingRuntimeTokenTableRow';

type ServingRuntimeTokensTableProps = {
  obj: ServingRuntimeKind | InferenceServiceKind;
  isTokenEnabled: boolean;
};

const ServingRuntimeTokensTable: React.FC<ServingRuntimeTokensTableProps> = ({
  obj,
  isTokenEnabled,
}) => {
  const {
    serverSecrets: { loaded, error },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);

  const name = isInferenceServiceKind(obj) ? obj.spec.predictor.model?.runtime : obj.metadata.name;

  const tokens = filterTokens(name);

  if (!isTokenEnabled) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">Tokens disabled</HelperTextItem>
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

export default ServingRuntimeTokensTable;
