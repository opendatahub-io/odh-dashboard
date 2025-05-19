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
import { Deployment, isModelServingDeploymentsTableExtension } from '../../../extension-points';

const genericColumns: SortableData<Deployment>[] = [
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
  platformColumns: SortableData<Deployment>[];
  cellRenderer?: (deployment: Deployment, column: string) => string;
}> = ({ deployment, platformColumns, cellRenderer }) => (
  <ResourceTr resource={deployment.model}>
    <Td dataLabel="Name">
      <TableRowTitleDescription
        title={deployment.model.metadata?.name}
        resource={deployment.model}
      />
    </Td>
    {platformColumns.map((column) => (
      <Td key={column.field} dataLabel={column.label}>
        {cellRenderer ? cellRenderer(deployment, column.field) : '-'}
      </Td>
    ))}
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
          cellRenderer={tableExtension?.properties.cellRenderer}
        />
      )}
    />
  );
};

export default DeploymentsTable;
