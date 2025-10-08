import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { TableRowTitleDescription } from 'mod-arch-shared';
import { MaaSModel } from '~/app/types';
import MaaSModelTableRowEndpoint from './MaaSModelTableRowEndpoint';

type MaaSModelTableRowProps = {
  model: MaaSModel;
};

const MaaSModelTableRow: React.FC<MaaSModelTableRowProps> = ({ model }) => (
  <Tr>
    <Td dataLabel="Model deployment name">
      <TableRowTitleDescription
        title={
          <>
            {model.id}
            <Label style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }} color="orange">
              MaaS
            </Label>
          </>
        }
      />
    </Td>
    <Td dataLabel="External endpoint">
      <MaaSModelTableRowEndpoint model={model} />
    </Td>
    <Td dataLabel="Status">
      {model.ready ? (
        <Label color="green" icon={<CheckCircleIcon />}>
          Active
        </Label>
      ) : (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Inactive
        </Label>
      )}
    </Td>
  </Tr>
);

export default MaaSModelTableRow;
