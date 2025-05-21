import React from 'react';
import {
  SortableData,
  Table,
  TableRowTitleDescription,
} from '@odh-dashboard/internal/components/table/index';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ActionsColumn, Td } from '@patternfly/react-table';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingDeploymentsTableExtension,
} from '../../../extension-points';
import DeleteModelServingModal from '../deleteModal/DeleteModelServingModal';

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
  onDelete: (deployment: Deployment) => void;
}> = ({ deployment, platformColumns, onDelete }) => (
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
      <ActionsColumn
        items={[
          {
            title: 'Delete',
            onClick: () => {
              onDelete(deployment);
            },
          },
        ]}
      />
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

  const [deleteDeployment, setDeleteDeployment] = React.useState<Deployment | undefined>(undefined);

  const platformColumns = React.useMemo(
    () => tableExtension?.properties.columns() ?? [],
    [tableExtension],
  );
  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [genericColumns[0], ...platformColumns, ...genericColumns.slice(1)],
    [platformColumns],
  );

  return (
    <>
      <Table
        columns={allColumns}
        data={deployments ?? []}
        rowRenderer={(row: Deployment) => (
          <DeploymentRow
            key={row.model.metadata?.name}
            deployment={row}
            platformColumns={platformColumns}
            onDelete={() => setDeleteDeployment(row)}
          />
        )}
      />
      {deleteDeployment && (
        <DeleteModelServingModal
          deployment={deleteDeployment}
          servingPlatform={modelServingPlatform}
          onClose={(deleted: boolean) => {
            fireFormTrackingEvent('Model Deleted', {
              outcome: deleted ? TrackingOutcome.submit : TrackingOutcome.cancel,
              type: 'single',
            });
            setDeleteDeployment(undefined);
          }}
        />
      )}
    </>
  );
};

export default DeploymentsTable;
