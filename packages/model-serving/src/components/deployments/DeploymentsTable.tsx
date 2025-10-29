import React from 'react';
import { SortableData, Table } from '@odh-dashboard/internal/components/table/index';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { DeploymentRow } from './row/DeploymentsTableRow';
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
    field: 'hardwareProfile',
    label: 'Hardware profile',
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
  showExpandedToggleColumn?: boolean;
  platformColumns?: DeploymentsTableColumn<Deployment>[];
  loaded: boolean;
  alertContent?: React.ReactNode;
} & Partial<
  Pick<
    React.ComponentProps<typeof Table>,
    'enablePagination' | 'toolbarContent' | 'onClearFilters' | 'emptyTableView'
  >
>;

const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  showExpandedToggleColumn,
  platformColumns,
  loaded = true,
  alertContent,
  ...tableProps
}) => {
  const [deleteDeployment, setDeleteDeployment] = React.useState<Deployment | undefined>(undefined);
  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [
      ...(showExpandedToggleColumn ? [expandedInfoColumn] : []),
      genericColumns[0],
      ...(platformColumns ?? []),
      ...genericColumns.slice(1),
    ],
    [platformColumns, showExpandedToggleColumn],
  );

  return (
    <>
      <Table
        data-testid="inference-service-table" // legacy testid
        columns={allColumns}
        defaultSortColumn={showExpandedToggleColumn ? 1 : 0}
        data={deployments}
        disableRowRenderSupport={showExpandedToggleColumn}
        rowRenderer={(row: Deployment, rowIndex: number) => (
          <DeploymentRow
            key={row.model.metadata.uid}
            rowIndex={rowIndex}
            deployment={row}
            platformColumns={platformColumns ?? []}
            onDelete={() => setDeleteDeployment(row)}
            showExpandedToggle={showExpandedToggleColumn}
          />
        )}
        loading={!loaded}
        alertContent={alertContent}
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
    </>
  );
};

export default DeploymentsTable;
