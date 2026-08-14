import React from 'react';
import { Flex, FlexItem, Icon, Popover, Spinner } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { Td, Tbody } from '@patternfly/react-table';
import {
  ResourceActionsColumn,
  ResourceTr,
  ResourceNameTooltip,
  StateActionToggle,
} from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource, SchedulingType } from '@odh-dashboard/k8s-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import {
  useHardwareProfileBindingState,
  MODEL_SERVING_VISIBILITY,
} from '@odh-dashboard/hardware-profiles/shared';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/internal/concepts/kueue/index';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import UnderlinedTruncateButton from '@odh-dashboard/internal/components/UnderlinedTruncateButton';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import {
  ModelStatusIcon,
  getDeploymentStatusSubtitle,
  getDeploymentStatusSubtitleColor,
} from '@odh-dashboard/model-serving/shared/components';
import { DeploymentHardwareProfileCell } from './DeploymentHardwareProfileCell';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import { useNavigateToDeploymentWizard } from '../../deploymentWizard/useNavigateToDeploymentWizard';
import DeploymentCapabilities from '../DeploymentCapabilities';
import DeploymentLastDeployed from '../DeploymentLastDeployed';
import DeploymentStatus from '../DeploymentStatus';
import DeployedModelsVersion from '../DeployedModelsVersion';
import ModelServingStopModal from '../ModelServingStopModal';
import DeploymentStatusModal from '../DeploymentStatusModal';
import { useDeploymentExtension } from '../../../concepts/extensionUtils';
import {
  Deployment,
  DeploymentsTableColumn,
  isModelServingMetricsExtension,
  isModelServingStartStopAction,
  type DeployedModelServingDetails,
} from '../../../../extension-points';
import { isModelServingDeploymentFormDataExtension } from '../../../../extension-points/deployment-wizard';
import { useModelDeploymentNotification } from '../../../concepts/useModelDeploymentNotification';
import { DeploymentMetricsLink } from '../../metrics/DeploymentMetricsLink';
import { shouldShowDeploymentMetricsLink } from '../../../concepts/deploymentUtils';
import useStopModalPreference from '../../../concepts/useStopModalPreference';
import { ExtensionDataEntry } from '../../../concepts/extensionHelpers/usePlatformExtensionDataMap';

export const DeploymentRow: React.FC<{
  deployment: Deployment;
  platformColumns: DeploymentsTableColumn[];
  onDelete: (deployment: Deployment) => void;
  rowIndex: number;
  showExpandedToggle?: boolean;
  showCapabilities?: boolean;
  servingDetailsEntry?: ExtensionDataEntry<DeployedModelServingDetails>;
}> = ({
  deployment,
  platformColumns,
  onDelete,
  rowIndex,
  showExpandedToggle,
  showCapabilities,
  servingDetailsEntry,
}) => {
  const metricsExtension = useDeploymentExtension(isModelServingMetricsExtension, deployment);

  const startStopActionExtension = useDeploymentExtension(
    isModelServingStartStopAction,
    deployment,
  );
  const [isExpanded, setExpanded] = React.useState(false);
  const [dontShowModalValue] = useStopModalPreference();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [isStatusModalOpen, setStatusModalOpen] = React.useState(false);
  const [isEditLoading, setEditLoading] = React.useState(false);

  const { watchDeployment } = useModelDeploymentNotification(deployment);

  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = deployment.model.metadata;
  const project = projects.find((p) => p.metadata.name === namespace);
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
    useHardwareProfileBindingState(deployment.model, MODEL_SERVING_VISIBILITY);
  const isStoppedOrStopping = Boolean(
    deployment.status?.stoppedStates?.isStopped || deployment.status?.stoppedStates?.isStopping,
  );
  const hardwareProfile = bindingStateInfo?.profile;
  const directQueueName = deployment.model.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const hasLocalQueueAssigned = hardwareProfile
    ? hardwareProfile.spec.scheduling?.type === SchedulingType.QUEUE &&
      Boolean(hardwareProfile.spec.scheduling.kueue?.localQueueName)
    : Boolean(directQueueName);
  const showKueueAnomalyIndicator =
    isKueueFeatureEnabled &&
    isProjectKueueEnabled &&
    !isStoppedOrStopping &&
    bindingStateLoaded &&
    !bindingStateLoadError &&
    !hasLocalQueueAssigned;

  const navigateToDeploymentWizard = useNavigateToDeploymentWizard(deployment);
  const statusSubtitle = getDeploymentStatusSubtitle(deployment.status);

  const [formDataExtensions, formDataResolved] = useResolvedExtensions(
    isModelServingDeploymentFormDataExtension,
  );
  const formDataExtension = React.useMemo(
    () =>
      formDataExtensions.find(
        (ext) => ext.properties.platform === deployment.modelServingPlatformId,
      ) ?? null,
    [formDataExtensions, deployment.modelServingPlatformId],
  );
  const hardwareProfilePaths = formDataExtension?.properties.hardwareProfilePaths;
  const pathsLoaded = formDataResolved && !!hardwareProfilePaths;

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
        {showExpandedToggle &&
          (pathsLoaded ? (
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
          ) : (
            <Td />
          ))}
        <Td dataLabel="Name">
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <ResourceNameTooltip resource={deployment.model}>
                {shouldShowDeploymentMetricsLink(deployment, metricsExtension) ? (
                  <DeploymentMetricsLink deployment={deployment} />
                ) : (
                  <span data-testid="deployed-model-name">
                    {getDisplayNameFromK8sResource(deployment.model)}
                  </span>
                )}
              </ResourceNameTooltip>
            </FlexItem>
            {showKueueAnomalyIndicator && (
              <FlexItem>
                <Popover
                  aria-label="Kueue scheduling not enabled"
                  bodyContent="This model deployment doesn't use Kueue scheduling. To enable it, edit the deployment and assign a hardware profile with a local queue."
                  data-testid="kueue-anomaly-popover"
                >
                  <Icon
                    role="button"
                    status="warning"
                    data-testid="kueue-anomaly-indicator"
                    aria-label="Model deployment bypasses Kueue queue management"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <ExclamationTriangleIcon />
                  </Icon>
                </Popover>
              </FlexItem>
            )}
          </Flex>
        </Td>
        {platformColumns.map((column) => (
          <Td key={column.field} dataLabel={column.label}>
            {column.cellRenderer(deployment, column.field)}
          </Td>
        ))}
        <Td dataLabel="Deployment resource">
          <DeployedModelsVersion
            deployment={deployment}
            servingDetailsEntry={servingDetailsEntry}
          />
        </Td>
        <Td dataLabel="Inference endpoints">
          <DeploymentStatus
            deployment={deployment}
            stoppedStates={deployment.status?.stoppedStates}
          />
        </Td>
        {formDataResolved ? (
          <DeploymentHardwareProfileCell
            deployment={deployment}
            bindingStateInfo={bindingStateInfo}
            bindingStateLoaded={bindingStateLoaded}
            bindingStateLoadError={bindingStateLoadError}
          />
        ) : (
          <Td dataLabel="Hardware profile">
            <Spinner size="md" />
          </Td>
        )}
        {showCapabilities && (
          <Td dataLabel="Capabilities">
            <DeploymentCapabilities deployment={deployment} />
          </Td>
        )}
        <Td dataLabel="Last deployed">
          <DeploymentLastDeployed deployment={deployment} />
        </Td>
        <Td dataLabel="Status">
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
            <FlexItem>
              <ModelStatusIcon
                state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
                bodyContent={deployment.status?.message}
                defaultHeaderContent="Inference Service Status"
                stoppedStates={deployment.status?.stoppedStates}
                kueueStatus={deployment.status?.kueueStatus}
                onClick={() => setStatusModalOpen(true)}
              />
            </FlexItem>
            {statusSubtitle != null && (
              <FlexItem>
                <UnderlinedTruncateButton
                  data-testid="deployment-status-subtitle"
                  content={statusSubtitle}
                  color={getDeploymentStatusSubtitleColor(deployment.status)}
                  onClick={() => setStatusModalOpen(true)}
                />
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td dataLabel="State toggle">
          {startStopActionExtension && deployment.status?.stoppedStates ? (
            <StateActionToggle
              currentState={deployment.status.stoppedStates}
              onStart={onStart}
              onStop={onStop}
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
                title: <span data-testid="edit-inference-service-action">Edit</span>,
                onClick: () => {
                  navigateToDeploymentWizard(deployment.model.metadata.namespace);
                },
              },
              { isSeparator: true },
              {
                title: <span data-testid="delete-inference-service-action">Delete</span>,
                onClick: () => {
                  onDelete(deployment);
                },
              },
            ]}
          />
        </Td>
      </ResourceTr>
      {showExpandedToggle && pathsLoaded && (
        <DeploymentRowExpandedSection
          deployment={deployment}
          isVisible={isExpanded}
          hardwareProfilePaths={hardwareProfilePaths}
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
      {isStatusModalOpen && (
        <DeploymentStatusModal
          deployment={deployment}
          onClose={() => {
            setStatusModalOpen(false);
            setEditLoading(false);
          }}
          onStopDeployment={
            startStopActionExtension && !deployment.status?.stoppedStates?.isStopped
              ? () => {
                  setStatusModalOpen(false);
                  onStop();
                }
              : undefined
          }
          onEditDeployment={() => {
            setEditLoading(true);
            navigateToDeploymentWizard(deployment.model.metadata.namespace);
          }}
          isEditLoading={isEditLoading}
        />
      )}
    </>
  );

  return showExpandedToggle ? <Tbody isExpanded={isExpanded}>{row}</Tbody> : row;
};
