import * as React from 'react';
import { SecretKind } from '../../../../k8sTypes';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import ResourceNameTooltip from '../../../projects/components/ResourceNameTooltip';
import { getTokenDisplayName } from '../global/utils';
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
}) => {
  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Token Name">
          <ResourceNameTooltip resource={token}>{getTokenDisplayName(token)}</ResourceNameTooltip>
        </Td>
        <Td dataLabel="Token Secret">
          <ServingRuntimeTokenDisplay token={token} loaded={loaded} error={error} />
        </Td>
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTokenTableRow;
