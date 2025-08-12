import React from 'react';
import { SortableData, Table } from '@odh-dashboard/internal/components/table/index';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { DeploymentRow } from './DeploymentsTableRow';
import { EditModelServingModal } from '../deploy/EditModelServingModal';
import { deploymentNameSort, deploymentLastDeployedSort } from '../../concepts/deploymentUtils';
import { Deployment, type DeploymentsTableColumn } from '../../../extension-points';
import DeleteModelServingModal from '../deleteModal/DeleteModelServingModal';

const expandedInfoColumn: SortableData<Deployment> = {
  field: 'expand',
  label: '',
  sortable: false,
};

const genericColumns: SortableData<Deployment>[] = [
  // Platform can enable expanded view of the deployment
  {
    label: 'Model deployment name',
    field: 'name',
    sortable: deploymentNameSort,
  },
  // Platform specific columns go here
  {
    field: 'servingRuntime',
    label: 'Serving runtime',
    sortable: false,
  },
  {
    label: 'Inference endpoints',
    field: 'inferenceEndpoint',
    sortable: false,
  },
  {
    label: 'API protocol',
    field: 'apiProtocol',
    sortable: false,
  },
  {
    label: 'Last deployed',
    field: 'lastDeployed',
    sortable: deploymentLastDeployedSort,
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

type DeploymentsTableProps = {
  deployments: Deployment[];
  showExpandedInfo?: boolean;
  platformColumns?: DeploymentsTableColumn<Deployment>[];
  loaded: boolean;
} & Partial<
  Pick<
    React.ComponentProps<typeof Table>,
    | 'enablePagination'
    | 'toolbarContent'
    | 'onClearFilters'
    | 'emptyTableView'
    | 'defaultSortColumn'
  >
>;

const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  showExpandedInfo,
  platformColumns,
  loaded = true,
  ...tableProps
}) => {
  const [deleteDeployment, setDeleteDeployment] = React.useState<Deployment | undefined>(undefined);
  const [editDeployment, setEditDeployment] = React.useState<Deployment | undefined>(undefined);
  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [
      ...(showExpandedInfo ? [expandedInfoColumn] : []),
      genericColumns[0],
      ...(platformColumns ?? []),
      ...genericColumns.slice(1),
    ],
    [platformColumns, showExpandedInfo],
  );

  return (
    <>
      <Table
        data-testid="inference-service-table" // legacy testid
        columns={allColumns}
        data={deployments}
        disableRowRenderSupport={showExpandedInfo}
        rowRenderer={(row: Deployment, rowIndex: number) => (
          <DeploymentRow
            key={row.model.metadata.uid}
            rowIndex={rowIndex}
            deployment={row}
            platformColumns={platformColumns ?? []}
            onDelete={() => setDeleteDeployment(row)}
            onEdit={() => setEditDeployment(row)}
            showExpandedInfo={showExpandedInfo}
          />
        )}
        loading={!loaded}
        {...tableProps}
      />
      {deleteDeployment && (
        <DeleteModelServingModal
          deployment={deleteDeployment}
          onClose={(deleted: boolean) => {
            fireFormTrackingEvent('Model Deleted', {
              outcome: deleted ? TrackingOutcome.submit : TrackingOutcome.cancel,
              type: 'single',
            });
            setDeleteDeployment(undefined);
          }}
        />
      )}
      {editDeployment && (
        <EditModelServingModal
          deployment={editDeployment}
          onClose={() => {
            setEditDeployment(undefined);
          }}
        />
      )}
    </>
  );
};

export default DeploymentsTable;
