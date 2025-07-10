import React from 'react';
import { Spinner, Bullseye } from '@patternfly/react-core';
import { SortableData, Table } from '@odh-dashboard/internal/components/table/index';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { DeploymentRow } from './DeploymentsTableRow';
import { deploymentNameSort } from '../../concepts/deploymentUtils';
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
    label: 'Inference endpoint',
    field: 'inferenceEndpoint',
    sortable: false,
  },
  {
    label: 'API protocol',
    field: 'apiProtocol',
    sortable: false,
  },
  {
    label: 'Last Deployed',
    field: 'lastDeployed',
    sortable: (a, b) => {
      // Sort by creation timestamp (newest first)
      const timeA = a.model.metadata.creationTimestamp;
      const timeB = b.model.metadata.creationTimestamp;

      if (timeA && timeB) {
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }

      // One has timestamp: prioritize the one with timestamp
      return (timeA ? -1 : 0) - (timeB ? -1 : 0);
    },
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
    'enablePagination' | 'toolbarContent' | 'onClearFilters' | 'emptyTableView'
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

  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [
      ...(showExpandedInfo ? [expandedInfoColumn] : []),
      genericColumns[0],
      ...(platformColumns ?? []),
      ...genericColumns.slice(1),
    ],
    [platformColumns, showExpandedInfo],
  );

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <Table
        data-testid="inference-service-table" // legacy testid
        columns={allColumns}
        data={deployments}
        disableRowRenderSupport
        rowRenderer={(row: Deployment, rowIndex: number) => (
          <DeploymentRow
            key={row.model.metadata.name}
            deployment={row}
            platformColumns={platformColumns ?? []}
            onDelete={() => setDeleteDeployment(row)}
            rowIndex={rowIndex}
            showExpandedInfo={showExpandedInfo}
          />
        )}
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
