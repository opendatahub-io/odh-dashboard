import * as React from 'react';
import { Text, Icon, Spinner, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import { getInferenceServiceActiveModelState, getInferenceServiceStatusMessage } from './utils';
import { useModelStatus } from './useModelStatus';

type InferenceServiceStatusProps = {
  inferenceService: InferenceServiceKind;
  isKserve: boolean;
};

const InferenceServiceStatus: React.FC<InferenceServiceStatusProps> = ({
  inferenceService,
  isKserve,
}) => {
  const [modelStatus] = useModelStatus(
    inferenceService.metadata.namespace,
    inferenceService.spec.predictor.model.runtime ?? '',
    isKserve,
  );

  const state = modelStatus?.failedToSchedule
    ? 'FailedToLoad'
    : getInferenceServiceActiveModelState(inferenceService);

  const StatusIcon = () => {
    switch (state) {
      case InferenceServiceModelState.LOADED:
      case InferenceServiceModelState.STANDBY:
        return (
          <Icon
            data-testid="status-tooltip"
            role="button"
            aria-label="success icon"
            status="success"
            isInline
            tabIndex={0}
          >
            <CheckCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return (
          <Icon
            data-testid="status-tooltip"
            role="button"
            aria-label="error icon"
            status="danger"
            isInline
            tabIndex={0}
          >
            <ExclamationCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.PENDING:
      case InferenceServiceModelState.LOADING:
        return (
          <Icon isInline>
            <Spinner size="md" />
          </Icon>
        );
      case InferenceServiceModelState.UNKNOWN:
        return (
          <Icon
            data-testid="status-tooltip"
            role="button"
            aria-label="warning icon"
            status="warning"
            isInline
            tabIndex={0}
          >
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
      default:
        return (
          <Icon
            data-testid="status-tooltip"
            role="button"
            aria-label="warning icon"
            status="warning"
            isInline
            tabIndex={0}
          >
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
    }
  };

  return (
    <Tooltip
      role="none"
      data-testid="model-status-tooltip"
      content={
        modelStatus?.failedToSchedule ? (
          <Text>Insufficient resources</Text>
        ) : (
          <Text>{getInferenceServiceStatusMessage(inferenceService)}</Text>
        )
      }
    >
      {StatusIcon()}
    </Tooltip>
  );
};

export default InferenceServiceStatus;
