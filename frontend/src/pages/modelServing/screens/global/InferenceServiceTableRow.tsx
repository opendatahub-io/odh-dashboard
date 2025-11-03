import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceActionsColumn from '#~/components/ResourceActionsColumn';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';

import { SupportedArea } from '#~/concepts/areas';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import StateActionToggle from '#~/components/StateActionToggle';
import { patchInferenceServiceStoppedStatus } from '#~/api/k8s/inferenceServices';
import useStopModalPreference from '#~/pages/modelServing/useStopModalPreference.ts';
import ModelServingStopModal from '#~/pages/modelServing/ModelServingStopModal';
import { useInferenceServiceStatus } from '#~/pages/modelServing/useInferenceServiceStatus.ts';
import { useModelDeploymentNotification } from '#~/pages/modelServing/screens/projects/useModelDeploymentNotification';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceStatus from './InferenceServiceStatus';
import InferenceServiceServingRuntime from './InferenceServiceServingRuntime';
import { ColumnField } from './data';
import InferenceServiceLastDeployed from './InferenceServiceLastDeployed';
import InferenceServiceAPIProtocol from './InferenceServiceAPIProtocol';

type InferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
  isGlobal?: boolean;
  servingRuntime?: ServingRuntimeKind;
  columnNames: string[];
  refresh?: () => void;
  onDeleteInferenceService: (obj: InferenceServiceKind) => void;
  onEditInferenceService: (obj: InferenceServiceKind) => void;
};

const InferenceServiceTableRow: React.FC<InferenceServiceTableRowProps> = ({
  obj: inferenceService,
  servingRuntime,
  refresh = () => undefined,
  onDeleteInferenceService,
  onEditInferenceService,
  isGlobal,
  columnNames,
}) => {
  const [dontShowModalValue] = useStopModalPreference();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(inferenceService.metadata.namespace)) ?? null;
  const isKServeNIMEnabled = project ? isProjectNIMSupported(project) : false;
  const servingPlatformStatuses = useServingPlatformStatuses();
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;

  const [modelMetricsEnabled] = useModelMetricsEnabled();

  // Always KServe (no ModelMesh)
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  const kserveMetricsSupported = modelMetricsEnabled && kserveMetricsEnabled;
  const displayName = getDisplayNameFromK8sResource(inferenceService);

  const { isStarting, isStopping, isStopped, isRunning, isFailed, setIsStarting, setIsStopping } =
    useInferenceServiceStatus(inferenceService, refresh);

  const { watchDeployment } = useModelDeploymentNotification(
    inferenceService.metadata.namespace,
    inferenceService.metadata.name,
    true, // Always KServe (no ModelMesh)
  );

  const onStart = React.useCallback(() => {
    setIsStarting(true);
    patchInferenceServiceStoppedStatus(inferenceService, 'false')
      .then(() => {
        refresh();
        watchDeployment();
      })
      .catch(() => setIsStarting(false));
  }, [inferenceService, refresh, setIsStarting, watchDeployment]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      setIsStarting(false);
      setIsStopping(true);
      patchInferenceServiceStoppedStatus(inferenceService, 'true').then(refresh);
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, inferenceService, refresh, setIsStarting, setIsStopping]);

  return (
    <>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={inferenceService}>
          {!isStarting && !isFailed && kserveMetricsSupported ? (
            <Link
              data-testid={`metrics-link-${displayName}`}
              to={
                isGlobal
                  ? `/ai-hub/deployments/${inferenceService.metadata.namespace}/metrics/${inferenceService.metadata.name}`
                  : `/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`
              }
            >
              <span data-testid="deployed-model-name">{displayName}</span>
            </Link>
          ) : (
            <span data-testid="deployed-model-name">{displayName}</span>
          )}
        </ResourceNameTooltip>
      </Td>

      {isGlobal && (
        <Td dataLabel="Project">
          <InferenceServiceProject inferenceService={inferenceService} isCompact />
        </Td>
      )}

      {columnNames.includes(ColumnField.ServingRuntime) && (
        <Td dataLabel="Serving runtime">
          <InferenceServiceServingRuntime servingRuntime={servingRuntime} />
        </Td>
      )}

      <Td dataLabel="Inference endpoints">
        <InferenceServiceEndpoint
          inferenceService={inferenceService}
          servingRuntime={servingRuntime}
          isKserve={true} // Always KServe
          modelState={{
            isStarting,
            isStopping,
            isStopped,
            isRunning,
            isFailed,
          }}
        />
      </Td>

      {columnNames.includes(ColumnField.ApiProtocol) && (
        <Td dataLabel="API protocol">
          <InferenceServiceAPIProtocol
            servingRuntime={servingRuntime}
            isMultiModel={false} // Always KServe (single model)
          />
        </Td>
      )}

      {columnNames.includes(ColumnField.LastDeployed) && (
        <Td dataLabel="Last deployed">
          <InferenceServiceLastDeployed inferenceService={inferenceService} />
        </Td>
      )}

      <Td dataLabel="Status">
        <InferenceServiceStatus
          inferenceService={inferenceService}
          isKserve={true} // Always KServe
          stoppedStates={{
            isStarting,
            isStopping,
            isStopped,
            isRunning,
          }}
        />
      </Td>
      <Td>
        <StateActionToggle
          currentState={{
            isRunning,
            isStopped,
            isStarting,
            isStopping,
          }}
          onStart={onStart}
          onStop={onStop}
          isDisabledWhileStarting={false}
        />
      </Td>

      {columnNames.includes(ColumnField.Kebab) && (
        <Td isActionCell>
          <ResourceActionsColumn
            resource={inferenceService}
            items={[
              {
                title: 'Edit',
                onClick: () => {
                  onEditInferenceService(inferenceService);
                },
                isDisabled: (!isNIMAvailable && isKServeNIMEnabled) || isStarting || isStopping,
              },
              { isSeparator: true },
              {
                title: 'Delete',
                onClick: () => {
                  onDeleteInferenceService(inferenceService);
                },
                isDisabled: isStarting || isStopping,
              },
            ]}
          />
        </Td>
      )}
      {isOpenConfirm && (
        <ModelServingStopModal
          modelName={displayName}
          title="Stop model deployment?"
          onClose={(confirmStatus) => {
            setOpenConfirm(false);
            if (confirmStatus) {
              setIsStarting(false);
              setIsStopping(true);
              patchInferenceServiceStoppedStatus(inferenceService, 'true').then(refresh);
            }
          }}
        />
      )}
    </>
  );
};

export default InferenceServiceTableRow;
