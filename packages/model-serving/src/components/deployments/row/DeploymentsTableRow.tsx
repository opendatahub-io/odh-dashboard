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
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import UnderlinedTruncateButton from '@odh-dashboard/internal/components/UnderlinedTruncateButton';
import useDebouncedTrueValue from '@odh-dashboard/internal/utilities/useDebouncedTrueValue';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import {
  ModelStatusIcon,
  getDeploymentStatusSubtitle,
  getDeploymentStatusSubtitleColor,
} from '@odh-dashboard/model-serving/shared/components';
import { DeploymentHardwareProfileCell } from './DeploymentHardwareProfileCell';
import { DeploymentRowExpandedSection } from './DeploymentsTableRowExpandedSection';
import { useNavigateToDeploymentWizard } from '../../deploymentWizard/useNavigateToDeploymentWizard';
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
  servingDetailsEntry?: ExtensionDataEntry<DeployedModelServingDetails>;
}> = ({
  deployment,
  platformColumns,
  onDelete,
  rowIndex,
  showExpandedToggle,
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
  // Anomaly = Kueue manages this namespace but no Workload CR was correlated to this deployment
  // (i.e. Kueue isn't actually scheduling it). Checking the IS's own queue label isn't reliable:
  // the label of record lives on the child Deployment's pod template, not necessarily the IS,
  // and a present label doesn't guarantee correlation actually succeeded (e.g. RBAC or
  // multi-pod-role gaps). Skip the check entirely while stopped/stopping — no pods, no Workload
  // CRs, by design — so it isn't a scheduling anomaly.
  const isStoppedOrStopping = Boolean(
    deployment.status?.stoppedStates?.isStopped || deployment.status?.stoppedStates?.isStopping,
  );
  const isKueueAnomalyCandidate =
    isKueueFeatureEnabled &&
    isProjectKueueEnabled &&
    !isStoppedOrStopping &&
    deployment.status?.kueueStatus === null;
  // The Workload/Pod correlation above is built from 3 independent watch streams that don't
  // update atomically, so `isKueueAnomalyCandidate` can blip `true` transiently (deploy,
  // rolling update, scale event) even when Kueue is scheduling this deployment correctly.
  // Debounce so only a sustained mismatch surfaces as a warning.
  const showKueueAnomalyIndicator = useDebouncedTrueValue(isKueueAnomalyCandidate);

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
          <DeploymentHardwareProfileCell deployment={deployment} />
        ) : (
          <Td dataLabel="Hardware profile">
            <Spinner size="md" />
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
