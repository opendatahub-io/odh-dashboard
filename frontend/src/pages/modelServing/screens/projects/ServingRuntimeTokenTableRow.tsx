import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { SecretKind } from '~/k8sTypes';
import ResourceNameTooltip from '~/pages/projects/components/ResourceNameTooltip';
import { getTokenDisplayName } from '~/pages/modelServing/screens/global/utils';
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
      <ResourceNameTooltip resource={token}>{getTokenDisplayName(token)}</ResourceNameTooltip>
    </Td>
    <Td dataLabel="Token Secret">
      <ServingRuntimeTokenDisplay token={token} loaded={loaded} error={error} />
    </Td>
  </Tr>
);

export default ServingRuntimeTokenTableRow;
