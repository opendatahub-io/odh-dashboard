import React from 'react';
import { Td, ActionsColumn, Tbody } from '@patternfly/react-table';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import StateActionToggle from '@odh-dashboard/internal/components/StateActionToggle';
import DeployedModelsVersion from './DeployedModelsVersion';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import DeploymentLastDeployed from './DeploymentLastDeployed';
import DeploymentStatus from './DeploymentStatus';
import ModelServingStopModal from './ModelServingStopModal';
import {
  useDeploymentExtension,
  useResolvedDeploymentExtension,
} from '../../concepts/extensionUtils';
import { getServerApiProtocol } from '../../concepts/deploymentUtils';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingAuthExtension,
  isModelServingDeploymentResourcesExtension,
  isModelServingDeploymentsExpandedInfo,
  isModelServingMetricsExtension,
  isModelServingStartStopAction,
} from '../../../extension-points';
import { DeploymentMetricsLink } from '../metrics/DeploymentMetricsLink';
import useStopModalPreference from '../../concepts/useStopModalPreference';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
  rowIndex: number;
  showExpandedInfo?: boolean;
}> = ({ deployment, platformColumns, onDelete, rowIndex, showExpandedInfo }) => {
  const metricsExtension = useDeploymentExtension(isModelServingMetricsExtension, deployment);
  // Loads instantly so we know if the row is expandable
  const detailsExtension = useDeploymentExtension(
    isModelServingDeploymentsExpandedInfo,
    deployment,
  );

  const [resolvedResourcesExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentResourcesExtension,
    deployment,
  );
  const [resolvedExpandedInfoExtension] = useResolvedDeploymentExtension(
    isModelServingDeploymentsExpandedInfo,
    deployment,
  );
  const [resolvedAuthExtension] = useResolvedDeploymentExtension(
    isModelServingAuthExtension,
    deployment,
  );
  const startStopActionExtension = useDeploymentExtension(
    isModelServingStartStopAction,
    deployment,
  );

  const [isExpanded, setExpanded] = React.useState(false);

  const [dontShowModalValue] = useStopModalPreference();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);

  const onStart = React.useCallback(() => {
    startStopActionExtension?.properties
      .patchDeploymentStoppedStatus()
      .then((resolvedFunction) => resolvedFunction(deployment, false));
  }, [deployment, startStopActionExtension]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      startStopActionExtension?.properties
        .patchDeploymentStoppedStatus()
        .then((resolvedFunction) => resolvedFunction(deployment, true));
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, deployment, startStopActionExtension]);

  return (
    <Tbody isExpanded={isExpanded}>
      <ResourceTr resource={deployment.model}>
        {detailsExtension && showExpandedInfo && (
          <Td
            expand={{
              rowIndex,
              expandId: `${deployment.modelServingPlatformId}-model-row-item`,
              isExpanded,
              onToggle: () => setExpanded(!isExpanded),
            }}
          />
        )}
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={deployment.model}>
            {metricsExtension &&
            deployment.model.metadata.namespace &&
            (deployment.status?.stoppedStates?.isRunning ||
              deployment.status?.stoppedStates?.isStopped) ? (
              <DeploymentMetricsLink deployment={deployment} data-testid="deployed-model-name" />
            ) : (
              <span data-testid="deployed-model-name">
                {getDisplayNameFromK8sResource(deployment.model)}
              </span>
            )}
          </ResourceNameTooltip>
        </Td>
        {platformColumns.map((column) => (
          <Td key={column.field} dataLabel={column.label}>
            {column.cellRenderer(deployment, column.field)}
          </Td>
        ))}
        <Td dataLabel="Serving runtime">
          <DeployedModelsVersion deployment={deployment} />
        </Td>
        <Td dataLabel="Inference endpoint">
          <DeploymentStatus deployment={deployment} />
        </Td>
        <Td dataLabel="API protocol">
          {getServerApiProtocol(deployment) ? (
            <Label color="yellow">{getServerApiProtocol(deployment)}</Label>
          ) : (
            <Content component={ContentVariants.small}>Not defined</Content>
          )}
        </Td>
        <Td dataLabel="Last deployed">
          <DeploymentLastDeployed deployment={deployment} />
        </Td>
        <Td dataLabel="Status">
          <ModelStatusIcon
            state={deployment.status?.state ?? InferenceServiceModelState.UNKNOWN}
            bodyContent={deployment.status?.message}
            defaultHeaderContent="Inference Service Status"
            stoppedStates={deployment.status?.stoppedStates}
          />
        </Td>
        <Td dataLabel="State toggle">
          {startStopActionExtension && deployment.status?.stoppedStates && (
            <StateActionToggle
              currentState={deployment.status.stoppedStates}
              onStart={onStart}
              onStop={onStop}
              isDisabledWhileStarting={false}
            />
          )}
        </Td>
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
      {isExpanded &&
        showExpandedInfo &&
        resolvedResourcesExtension &&
        resolvedExpandedInfoExtension &&
        resolvedAuthExtension && (
          <DeploymentRowExpandedSection
            deployment={deployment}
            useResources={resolvedResourcesExtension.properties.useResources}
            useFramework={resolvedExpandedInfoExtension.properties.useFramework}
            useReplicas={resolvedExpandedInfoExtension.properties.useReplicas}
            usePlatformAuth={resolvedAuthExtension.properties.usePlatformAuthEnabled}
          />
        )}
      {isOpenConfirm && startStopActionExtension && (
        <ModelServingStopModal
          modelName={getDisplayNameFromK8sResource(deployment.model)}
          title="Stop model deployment?"
          onClose={(confirmStatus: boolean) => {
            setOpenConfirm(false);
            if (confirmStatus) {
              startStopActionExtension.properties
                .patchDeploymentStoppedStatus()
                .then((resolvedFunction) => resolvedFunction(deployment, true));
            }
          }}
        />
      )}
    </Tbody>
  );
};
