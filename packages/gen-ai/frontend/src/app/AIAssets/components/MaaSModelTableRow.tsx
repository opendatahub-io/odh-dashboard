import * as React from 'react';
import { Label, Popover } from '@patternfly/react-core';
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
            <Popover aria-label="Models as a Service" bodyContent={<>Models as a Service</>}>
              <Label
                style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}
                color="orange"
                aria-label="Model as a Service"
              >
                MaaS
              </Label>
            </Popover>
          </>
        }
      />
    </Td>
    <Td dataLabel="External endpoint">
      <MaaSModelTableRowEndpoint model={model} />
    </Td>
    <Td dataLabel="Status">
      {model.ready ? (
        <Label
          color="green"
          icon={<CheckCircleIcon aria-label="Active status" />}
          aria-label={`${model.id} status: Active`}
        >
          Active
        </Label>
      ) : (
        <Label
          color="red"
          icon={<ExclamationCircleIcon aria-label="Inactive status" />}
          aria-label={`${model.id} status: Inactive`}
        >
          Inactive
        </Label>
      )}
    </Td>
  </Tr>
);

export default MaaSModelTableRow;
