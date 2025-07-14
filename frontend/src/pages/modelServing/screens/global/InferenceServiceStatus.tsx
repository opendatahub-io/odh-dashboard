import * as React from 'react';
import { ModelStatusIcon } from '#~/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceKind } from '#~/k8sTypes';
import {
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { useModelStatus } from './useModelStatus';

type InferenceServiceStatusProps = {
  inferenceService: InferenceServiceKind;
  isKserve: boolean;
  isStarting?: boolean;
  isStopping?: boolean;
  isStopped?: boolean;
};

const InferenceServiceStatus: React.FC<InferenceServiceStatusProps> = ({
  inferenceService,
  isKserve,
  isStarting,
  isStopping,
  isStopped,
}) => {
  const [modelPodStatus] = useModelStatus(
    inferenceService.metadata.namespace,
    inferenceService.spec.predictor.model?.runtime ?? '',
    isKserve,
  );

  const state = getInferenceServiceModelState(inferenceService, modelPodStatus);
  const bodyContent = getInferenceServiceStatusMessage(inferenceService, modelPodStatus);

  return (
    <ModelStatusIcon
      state={state}
      defaultHeaderContent="Inference Service Status"
      bodyContent={bodyContent}
      isStarting={isStarting}
      isStopping={isStopping}
      isStopped={isStopped}
    />
  );
};

export default InferenceServiceStatus;
