import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceActionsColumn from '#~/components/ResourceActionsColumn';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getInferenceServiceStoppedStatus, isModelMesh } from '#~/pages/modelServing/utils';
import { SupportedArea } from '#~/concepts/areas';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import StateActionToggle from '#~/components/StateActionToggle';
import { patchInferenceServiceStoppedStatus } from '#~/api/k8s/inferenceServices';
import { getInferenceServiceModelState } from '#~/concepts/modelServingKServe/kserveStatusUtils.ts';
import useStopModalPreference from '#~/pages/modelServing/useStopModalPreference.ts';
import ModelServingStopModal from '#~/pages/modelServing/ModelServingStopModal';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import useModelPodStatus from '#~/pages/modelServing/useModelPodStatus';
import useRefreshInterval from '#~/utilities/useRefreshInterval.ts';
import { FAST_POLL_INTERVAL } from '#~/utilities/const.ts';
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

  const [isStarting, setIsStarting] = React.useState(false);

  const { data: modelPodStatus, refresh: refreshModelPodStatus } = useModelPodStatus(
    inferenceService.metadata.namespace,
    inferenceService.metadata.name,
  );

  const modelServingStatus = React.useMemo(
    () => getInferenceServiceStoppedStatus(inferenceService, modelPodStatus),
    [inferenceService, modelPodStatus],
  );

  useRefreshInterval(FAST_POLL_INTERVAL, async () => {
    await refreshModelPodStatus();
    if (isStarting) {
      refresh();
    }
  });

  const onStart = React.useCallback(() => {
    setIsStarting(true);
    patchInferenceServiceStoppedStatus(inferenceService, 'false')
      .then(refresh)
      .catch(() => setIsStarting(false));
  }, [inferenceService, refresh]);

  React.useEffect(() => {
    if (!isStarting) {
      return;
    }

    const currentState = getInferenceServiceModelState(inferenceService);

    if (
      currentState === InferenceServiceModelState.LOADING ||
      currentState === InferenceServiceModelState.PENDING
    ) {
      setIsStarting(true);
    }

    if (
      [InferenceServiceModelState.LOADED, InferenceServiceModelState.FAILED_TO_LOAD].includes(
        currentState,
      )
    ) {
      setIsStarting(false);
    }
  }, [isStarting, inferenceService]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      setIsStarting(false);
      patchInferenceServiceStoppedStatus(inferenceService, 'true').then(refresh);
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, inferenceService, refresh]);

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
          isStarting={isStarting}
          isStopping={modelServingStatus.isStopping}
          isStopped={modelServingStatus.isStopped}
        />
      </Td>
      <Td>
        <StateActionToggle
          currentState={isStarting ? { ...modelServingStatus, isStarting } : modelServingStatus} // if missing isStarting state when first deploying the model default to modelServingStatus
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
          title="Stop model?"
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              patchInferenceServiceStoppedStatus(inferenceService, 'true').then(refresh);
            }
            setOpenConfirm(false);
          }}
        />
      )}
    </>
  );
};

export default InferenceServiceTableRow;
