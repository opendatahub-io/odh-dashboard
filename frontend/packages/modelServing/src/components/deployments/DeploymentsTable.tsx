import React from 'react';
import { Spinner, Bullseye } from '@patternfly/react-core';
import { SortableData, Table } from '@odh-dashboard/internal/components/table/index';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { useExtensions } from '@openshift/dynamic-plugin-sdk';
import { DeploymentRow } from './DeploymentsTableRow';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { useResolvedPlatformExtension } from '../../concepts/extensionUtils';
import { deploymentNameSort } from '../../concepts/deploymentUtils';
import {
  Deployment,
  isModelServingDeploymentsExpandedInfo,
  isModelServingDeploymentsTableExtension,
  isModelServingMetricsExtension,
} from '../../../extension-points';
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
  const [expandedInfoExtension, expandedInfoExtensionLoaded] = useResolvedPlatformExtension(
    isModelServingDeploymentsExpandedInfo,
    modelServingPlatform,
  );

  const metricsExtensions = useExtensions(isModelServingMetricsExtension);

  const [deleteDeployment, setDeleteDeployment] = React.useState<Deployment | undefined>(undefined);

  const platformColumns = React.useMemo(
    () => tableExtension?.properties.columns() ?? [],
    [tableExtension],
  );
  const allColumns: SortableData<Deployment>[] = React.useMemo(
    () => [
      ...(expandedInfoExtension ? [expandedInfoColumn] : []),
      genericColumns[0],
      ...platformColumns,
      ...genericColumns.slice(1),
    ],
    [platformColumns, expandedInfoExtension],
  );

  if (!tableExtensionLoaded || !expandedInfoExtensionLoaded) {
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
        rowRenderer={(row: Deployment, rowIndex: number) => (
          <DeploymentRow
            key={row.model.metadata.name}
            deployment={row}
            platformColumns={platformColumns}
            onDelete={() => setDeleteDeployment(row)}
            rowIndex={rowIndex}
            metricsExtension={metricsExtensions.find(
              (ext) => ext.properties.platform === row.modelServingPlatformId,
            )}
          />
        )}
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
