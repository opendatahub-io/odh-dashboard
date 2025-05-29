import React from 'react';
import { Td, ActionsColumn } from '@patternfly/react-table';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { TableRowTitleDescription } from '@odh-dashboard/internal/components/table/index';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { Deployment, DeploymentsTableColumn } from '../../../extension-points';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
}> = ({ deployment, platformColumns }) => (
  <ResourceTr resource={deployment.model}>
    <Td dataLabel="Name">
      <TableRowTitleDescription
        title={deployment.model.metadata?.name}
        resource={deployment.model}
      />
    </Td>
    {platformColumns.map((column) => (
      <Td key={column.field} dataLabel={column.label}>
        {column.cellRenderer(deployment, column.field)}
      </Td>
    ))}
    <Td dataLabel="Inference endpoint">-</Td>
    <Td dataLabel="Status">
      <ModelStatusIcon
        state={deployment.status?.state ?? InferenceServiceModelState.UNKNOWN}
        bodyContent={deployment.status?.message}
        defaultHeaderContent="Inference Service Status"
      />
    </Td>
    <Td isActionCell>
      <ActionsColumn isDisabled items={[]} />
    </Td>
  </ResourceTr>
);
