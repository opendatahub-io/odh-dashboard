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
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatform } from 'concepts/modelServingPlatforms';
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
        example platform column
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
  const platformTableExtension = useExtensions(
    isModelServingDeploymentsTableExtension(modelServingPlatform),
  )[0];

  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [
      genericColumns[0],
      ...platformTableExtension.properties.columns,
      ...genericColumns.slice(1),
    ],
    [platformTableExtension],
  );

  return (
    <Table
      columns={allColumns}
      data={deployments ?? []}
      rowRenderer={(row: Deployment) => (
        <DeploymentRow
          deployment={row}
          platformColumns={platformTableExtension.properties.columns}
        />
      )}
    />
  );
};

export default DeploymentsTable;
