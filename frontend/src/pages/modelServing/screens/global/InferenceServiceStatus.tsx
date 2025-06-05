import * as React from 'react';
import { Icon } from '@patternfly/react-core';
import { InferenceServiceKind } from '#~/k8sTypes';
import { ModelStatusIcon } from '#~/concepts/modelServing/ModelStatusIcon';
import {
  getInferenceServiceModelState,
  getInferenceServiceStatusMessage,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { useModelStatus } from './useModelStatus';

type InferenceServiceStatusProps = {
  inferenceService: InferenceServiceKind;
  isKserve: boolean;
  iconSize?: React.ComponentProps<typeof Icon>['iconSize'];
};

const InferenceServiceStatus: React.FC<InferenceServiceStatusProps> = ({
  inferenceService,
  isKserve,
  iconSize,
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
      iconSize={iconSize}
    />
  );
};

export default InferenceServiceStatus;
