import * as React from 'react';
import { Icon } from '@patternfly/react-core';
import { InferenceServiceKind } from '#~/k8sTypes';
import { ModelStatusIcon } from '#~/concepts/modelServing/ModelStatusIcon';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
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
  const [modelStatus] = useModelStatus(
    inferenceService.metadata.namespace,
    inferenceService.spec.predictor.model?.runtime ?? '',
    isKserve,
  );

  const state = modelStatus?.failedToSchedule
    ? InferenceServiceModelState.FAILED_TO_LOAD
    : getInferenceServiceModelState(inferenceService);

  const bodyContent = modelStatus?.failedToSchedule
    ? modelStatus.failureMessage || 'Insufficient resources'
    : getInferenceServiceStatusMessage(inferenceService);

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
