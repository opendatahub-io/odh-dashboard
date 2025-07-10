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
import StateActionToggle from '#~/components/StateActionToggle';
import { patchInferenceServiceStoppedStatus } from '#~/api/k8s/inferenceServices';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import useStopModalPreference from '#~/pages/modelServing/useStopModalPreference';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import ModelServingStopModal from '#~/pages/modelServing/ModelServingStopModal';
import { getInferenceServiceModelState } from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceStatus from './InferenceServiceStatus';
import InferenceServiceServingRuntime from './InferenceServiceServingRuntime';
import InferenceServiceAPIProtocol from './InferenceServiceAPIProtocol';
import { ColumnField } from './data';
import InferenceServiceLastDeployed from './InferenceServiceLastDeployed';

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

  const modelMesh = isModelMesh(inferenceService);
  const modelMeshMetricsSupported = modelMetricsEnabled && modelMesh;
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  const kserveMetricsSupported = modelMetricsEnabled && kserveMetricsEnabled && !modelMesh;
  const displayName = getDisplayNameFromK8sResource(inferenceService);

  const { isStarting, isStopping, isStopped, isRunning, isFailed, setIsStarting, setIsStopping } =
    useInferenceServiceStatus(inferenceService, refresh);

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
          {!isStarting && !isFailed && (modelMeshMetricsSupported || kserveMetricsSupported) ? (
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
            isMultiModel={modelMeshMetricsSupported}
          />
        </Td>
      )}

      {columnNames.includes(ColumnField.LastDeployed) && (
        <Td dataLabel="Last Deployed">
          <InferenceServiceLastDeployed inferenceService={inferenceService} />
        </Td>
      )}

      <Td dataLabel="Status">
        <InferenceServiceStatus
          inferenceService={inferenceService}
          isKserve={!modelMesh}
          isStarting={isStarting}
          isStopping={isStopping}
          isStopped={isStopped}
        />
      </Td>
      <Td>
        {!modelMesh && (
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
