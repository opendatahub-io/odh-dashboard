import * as React from 'react';
import { ModelStatusIcon } from '#~/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceKind } from '#~/k8sTypes';
import {
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { ToggleState } from '#~/components/StateActionToggle';
import { useModelStatus } from './useModelStatus';

type InferenceServiceStatusProps = {
  inferenceService: InferenceServiceKind;
  isKserve: boolean;
  stoppedStates: ToggleState;
};

const InferenceServiceStatus: React.FC<InferenceServiceStatusProps> = ({
  inferenceService,
  isKserve,
  stoppedStates,
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
      stoppedStates={stoppedStates}
    />
  );
};

export default InferenceServiceStatus;
