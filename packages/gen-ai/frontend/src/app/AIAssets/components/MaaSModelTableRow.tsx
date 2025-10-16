import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { TableRowTitleDescription } from 'mod-arch-shared';
import { MaaSModel } from '~/app/types';
import MaaSModelTableRowEndpoint from './MaaSModelTableRowEndpoint';

type MaaSModelTableRowProps = {
  model: MaaSModel;
  namespace: string;
};

const MaaSModelTableRow: React.FC<MaaSModelTableRowProps> = ({ model, namespace }) => (
  <Tr>
    <Td dataLabel="Model deployment name">
      <TableRowTitleDescription
        title={
          <>
            {model.id}
            <Label
              style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}
              color="orange"
              aria-label="Model as a Service"
            >
              MaaS
            </Label>
          </>
        }
      />
    </Td>
    <Td dataLabel="External endpoint">
      <MaaSModelTableRowEndpoint model={model} namespace={namespace} />
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
