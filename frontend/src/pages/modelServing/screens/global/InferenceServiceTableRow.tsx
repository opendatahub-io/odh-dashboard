import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceActionsColumn from '#~/components/ResourceActionsColumn';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { isModelMesh } from '#~/pages/modelServing/utils';
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
import { useModelStatus } from '#~/pages/modelServing/useModelStatus';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceStatus from './InferenceServiceStatus';
import InferenceServiceServingRuntime from './InferenceServiceServingRuntime';
import InferenceServiceAPIProtocol from './InferenceServiceAPIProtocol';
import { ColumnField } from './data';

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
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  const modelMesh = isModelMesh(inferenceService);
  const modelMeshMetricsSupported = modelMetricsEnabled && modelMesh;
  const kserveMetricsSupported = modelMetricsEnabled && kserveMetricsEnabled && !modelMesh;
  const displayName = getDisplayNameFromK8sResource(inferenceService);

  const { isStarting, isStopping, isStopped, isRunning, setIsStarting, setIsStopping } =
    useModelStatus(inferenceService, refresh);

  const isNewlyDeployed = React.useMemo(
    () =>
      !inferenceService.status?.modelStatus?.states?.activeModelState &&
      inferenceService.status?.modelStatus?.states?.targetModelState !==
        InferenceServiceModelState.FAILED_TO_LOAD,
    [inferenceService.status?.modelStatus?.states],
  );

  const onStart = React.useCallback(() => {
    setIsStarting(true);
    patchInferenceServiceStoppedStatus(inferenceService, 'false')
      .then(refresh)
      .catch(() => setIsStarting(false));
  }, [inferenceService, refresh, setIsStarting]);

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
          {modelMeshMetricsSupported || kserveMetricsSupported ? (
            <Link
              data-testid={`metrics-link-${displayName}`}
              to={
                isGlobal
                  ? `/modelServing/${inferenceService.metadata.namespace}/metrics/${inferenceService.metadata.name}`
                  : `/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`
              }
            >
              {displayName}
            </Link>
          ) : (
            displayName
          )}
        </ResourceNameTooltip>
      </Td>

      {isGlobal && (
        <Td dataLabel="Project">
          <InferenceServiceProject inferenceService={inferenceService} isCompact />
        </Td>
      )}

      {columnNames.includes(ColumnField.ServingRuntime) && (
        <Td dataLabel="Serving Runtime">
          <InferenceServiceServingRuntime
            servingRuntime={servingRuntime}
            isProjectScoped={isProjectScoped}
          />
        </Td>
      )}

      <Td dataLabel="Inference endpoint">
        <InferenceServiceEndpoint
          inferenceService={inferenceService}
          servingRuntime={servingRuntime}
          isKserve={!modelMesh}
          modelState={{
            isStarting: isStarting || isNewlyDeployed,
            isStopping,
            isStopped,
            isRunning,
          }}
        />
      </Td>

      {columnNames.includes(ColumnField.ApiProtocol) && (
        <Td dataLabel="API protocol">
          <InferenceServiceAPIProtocol
            servingRuntime={servingRuntime}
            isMultiModel={modelMeshMetricsSupported}
          />
        </Td>
      )}

      <Td dataLabel="Status">
        <InferenceServiceStatus
          inferenceService={inferenceService}
          isKserve={!modelMesh}
          isStarting={isStarting || isNewlyDeployed}
          isStopping={isStopping}
          isStopped={isStopped && !isStopping}
        />
      </Td>
      <Td>
        {!modelMesh && (
          <StateActionToggle
            currentState={{
              isRunning: isRunning && !isStarting,
              isStopped: isStopped && !isStopping,
              isStarting,
              isStopping,
            }}
            onStart={onStart}
            onStop={onStop}
            isDisabledWhileStarting={false}
          />
        )}
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
                isDisabled: !isNIMAvailable && isKServeNIMEnabled,
              },
              { isSeparator: true },
              {
                title: 'Delete',
                onClick: () => {
                  onDeleteInferenceService(inferenceService);
                },
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
