import React from 'react';
import { Td, Tbody } from '@patternfly/react-table';
import { Label, Content, ContentVariants } from '@patternfly/react-core';
import ResourceActionsColumn from '@odh-dashboard/internal/components/ResourceActionsColumn';
import ResourceTr from '@odh-dashboard/internal/components/ResourceTr';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import StateActionToggle from '@odh-dashboard/internal/components/StateActionToggle';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import DeploymentLastDeployed from '../DeploymentLastDeployed';
import DeploymentStatus from '../DeploymentStatus';
import DeployedModelsVersion from '../DeployedModelsVersion';
import ModelServingStopModal from '../ModelServingStopModal';
import { useDeploymentExtension } from '../../../concepts/extensionUtils';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingMetricsExtension,
  isModelServingStartStopAction,
} from '../../../../extension-points';
import { useModelDeploymentNotification } from '../../../concepts/useModelDeploymentNotification';
import { DeploymentMetricsLink } from '../../metrics/DeploymentMetricsLink';
import useStopModalPreference from '../../../concepts/useStopModalPreference';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
  onEdit: (deployment: Deployment) => void;
  rowIndex: number;
  showExpandedToggle?: boolean;
}> = ({ deployment, platformColumns, onDelete, onEdit, rowIndex, showExpandedToggle }) => {
  const metricsExtension = useDeploymentExtension(isModelServingMetricsExtension, deployment);

  const startStopActionExtension = useDeploymentExtension(
    isModelServingStartStopAction,
    deployment,
  );
  const [isExpanded, setExpanded] = React.useState(false);
  const [dontShowModalValue] = useStopModalPreference();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);

  const { watchDeployment } = useModelDeploymentNotification(deployment);

  const onStart = React.useCallback(() => {
    if (!startStopActionExtension) return;
    startStopActionExtension.properties
      .patchDeploymentStoppedStatus()
      .then(async (resolvedFunction) => {
        await resolvedFunction(deployment, false);
        // Start watching for deployment status changes
        watchDeployment();
      });
  }, [deployment, startStopActionExtension, watchDeployment]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      startStopActionExtension?.properties
        .patchDeploymentStoppedStatus()
        .then((resolvedFunction) => resolvedFunction(deployment, true));
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, deployment, startStopActionExtension]);

  const row = (
    <>
      <ResourceTr resource={deployment.model}>
        {showExpandedToggle && (
          <Td
            {...{
              'data-testid': `${deployment.modelServingPlatformId}-model-row-item`,
              expand: {
                rowIndex,
                expandId: `${deployment.modelServingPlatformId}-model-row-item`,
                isExpanded,
                onToggle: () => setExpanded(!isExpanded),
              },
            }}
          />
        )}
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={deployment.model}>
            {metricsExtension &&
            deployment.model.metadata.namespace &&
            (deployment.status?.stoppedStates?.isRunning ||
              deployment.status?.stoppedStates?.isStopped) ? (
              <DeploymentMetricsLink deployment={deployment} />
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
        <Td dataLabel="Inference endpoints">
          <DeploymentStatus
            deployment={deployment}
            stoppedStates={deployment.status?.stoppedStates}
          />
        </Td>
        <Td dataLabel="API protocol">
          {deployment.apiProtocol ? (
            <Label color="yellow">{deployment.apiProtocol}</Label>
          ) : (
            <Content component={ContentVariants.small}>Not defined</Content>
          )}
        </Td>
        <Td dataLabel="Last deployed">
          <DeploymentLastDeployed deployment={deployment} />
        </Td>
        <Td dataLabel="Status">
          <ModelStatusIcon
            state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
            bodyContent={deployment.status?.message}
            defaultHeaderContent="Inference Service Status"
            stoppedStates={deployment.status?.stoppedStates}
          />
        </Td>
        <Td dataLabel="State toggle">
          {startStopActionExtension && deployment.status?.stoppedStates ? (
            <StateActionToggle
              currentState={deployment.status.stoppedStates}
              onStart={onStart}
              onStop={onStop}
              isDisabledWhileStarting={false}
            />
          ) : (
            '-'
          )}
        </Td>
        <Td isActionCell>
          <ResourceActionsColumn
            resource={deployment.model}
            items={[
              {
                title: 'Edit',
                onClick: () => {
                  onEdit(deployment);
                },
                isDisabled:
                  deployment.status?.stoppedStates?.isStarting ||
                  deployment.status?.stoppedStates?.isStopping,
              },
              { isSeparator: true },
              {
                title: 'Delete',
                onClick: () => {
                  onDelete(deployment);
                },
                isDisabled:
                  deployment.status?.stoppedStates?.isStarting ||
                  deployment.status?.stoppedStates?.isStopping,
              },
            ]}
          />
        </Td>
      </ResourceTr>
      {showExpandedToggle && (
        <DeploymentRowExpandedSection deployment={deployment} isVisible={isExpanded} />
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
    </>
  );

  return showExpandedToggle ? <Tbody isExpanded={isExpanded}>{row}</Tbody> : row;
};
