import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  SortableData,
  Table,
  TableRowTitleDescription,
} from '@odh-dashboard/internal/components/table/index';
// eslint-disable-next-line import/no-extraneous-dependencies
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ActionsColumn, Td } from '@patternfly/react-table';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingDeploymentsTableExtension,
} from '../../../extension-points';

const genericColumns: SortableData<Deployment>[] = [
  // Platform can enable expanded view of the deployment
  // {
  //   field: 'expand',
  //   label: '',
  //   sortable: false,
  // },
  {
    label: 'Model deployment name',
    field: 'name',
    sortable: true,
  },
  // Platform specific columns go here
  {
    label: 'Inference endpoint',
    field: 'inferenceEndpoint',
    sortable: false,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: false,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];

const DeploymentRow: React.FC<{
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
    <Td dataLabel="Status">-</Td>
    <Td isActionCell>
      <ActionsColumn isDisabled items={[]} />
    </Td>
  </ResourceTr>
);

const DeploymentsTable: React.FC<{
  modelServingPlatform: ModelServingPlatform;
  deployments: Deployment[] | undefined;
}> = ({ modelServingPlatform, deployments }) => {
  const tableExtension = useResolvedPlatformExtension(
    isModelServingDeploymentsTableExtension,
    modelServingPlatform,
  );

  const platformColumns = React.useMemo(
    () => tableExtension?.properties.columns() ?? [],
    [tableExtension],
  );
  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [genericColumns[0], ...platformColumns, ...genericColumns.slice(1)],
    [platformColumns],
  );

  return (
    <Table
      columns={allColumns}
      data={deployments ?? []}
      rowRenderer={(row: Deployment) => (
        <DeploymentRow
          key={row.model.metadata?.name}
          deployment={row}
          platformColumns={platformColumns}
        />
      )}
    />
  );
};

export default DeploymentsTable;
