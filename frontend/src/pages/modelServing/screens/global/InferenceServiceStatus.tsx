import * as React from 'react';
import { Content, Icon, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import { getInferenceServiceActiveModelState, getInferenceServiceStatusMessage } from './utils';
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
    ? 'FailedToLoad'
    : getInferenceServiceActiveModelState(inferenceService);

  const statusIcon = () => {
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
            iconSize={iconSize}
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
            iconSize={iconSize}
          >
            <ExclamationCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.PENDING:
      case InferenceServiceModelState.LOADING:
        return (
          <Icon isInline iconSize={iconSize}>
            <InProgressIcon />
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
            iconSize={iconSize}
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
            iconSize={iconSize}
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
          <Content component="p">Insufficient resources</Content>
        ) : (
          <Content component="p">{getInferenceServiceStatusMessage(inferenceService)}</Content>
        )
      }
    >
      {statusIcon()}
    </Tooltip>
  );
};

export default InferenceServiceStatus;
