import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import ServingRuntimeTokenDisplay from './ServingRuntimeTokenDisplay';

type ServingRuntimeTokenTableRowProps = {
  obj: SecretKind;
  loaded: boolean;
  error: Error | undefined;
};

const ServingRuntimeTokenTableRow: React.FC<ServingRuntimeTokenTableRowProps> = ({
  obj: token,
  loaded,
  error,
}) => (
  <Tr>
    <Td dataLabel="Token Name">
      <ResourceNameTooltip resource={token}>
        {getDisplayNameFromK8sResource(token)}
      </ResourceNameTooltip>
    </Td>
    <Td dataLabel="Token Secret">
      <ServingRuntimeTokenDisplay token={token} loaded={loaded} error={error} />
    </Td>
  </Tr>
);

export default ServingRuntimeTokenTableRow;
