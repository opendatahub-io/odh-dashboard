import React from 'react';
import { Spinner, Bullseye } from '@patternfly/react-core';
import { SortableData, Table } from '@odh-dashboard/internal/components/table/index';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { DeploymentRow } from './DeploymentsTableRow';
import { deploymentNameSort } from '../../concepts/deploymentUtils';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';
import { Deployment, isModelServingDeploymentsTableExtension } from '../../../extension-points';
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
    sortable: deploymentNameSort,
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

const DeploymentsTable: React.FC<{
  modelServingPlatform: ModelServingPlatform;
  deployments: Deployment[] | undefined;
}> = ({ modelServingPlatform, deployments }) => {
  const [tableExtension, tableExtensionLoaded] = useResolvedPlatformExtension(
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

  if (!tableExtensionLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <>
      <Table
        columns={allColumns}
        data={deployments ?? []}
        rowRenderer={(row: Deployment) => (
          <DeploymentRow
            key={row.model.metadata.name}
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
