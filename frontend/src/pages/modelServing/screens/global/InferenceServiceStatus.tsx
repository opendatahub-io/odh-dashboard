import * as React from 'react';
import { Icon, Popover, Button } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import { getInferenceServiceModelState, getInferenceServiceStatusMessage } from './utils';
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
    : getInferenceServiceModelState(inferenceService);

  const statusIcon = () => {
    switch (state) {
      case InferenceServiceModelState.LOADED:
      case InferenceServiceModelState.STANDBY:
        return (
          <Button
            aria-label="success status"
            variant="link"
            isInline
            data-testid="status-tooltip"
            icon={
              <Icon status="success" isInline iconSize={iconSize}>
                <CheckCircleIcon />
              </Icon>
            }
          />
        );
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return (
          <Button
            aria-label="danger status"
            variant="link"
            isInline
            data-testid="status-tooltip"
            icon={
              <Icon status="danger" isInline iconSize={iconSize}>
                <ExclamationCircleIcon />
              </Icon>
            }
          />
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
          <Button
            aria-label="warning status"
            variant="link"
            isInline
            data-testid="status-tooltip"
            icon={
              <Icon status="warning" isInline iconSize={iconSize}>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
          />
        );
      default:
        return (
          <Button
            aria-label="warning status"
            variant="link"
            isInline
            data-testid="status-tooltip"
            icon={
              <Icon status="warning" isInline iconSize={iconSize}>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
          />
        );
    }
  };

  const headerContent = () => {
    switch (state) {
      case InferenceServiceModelState.LOADED:
        return 'Available';
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return 'Failed';
      case InferenceServiceModelState.PENDING:
      case InferenceServiceModelState.LOADING:
        return 'In Progress';
      case InferenceServiceModelState.UNKNOWN:
        return 'Status Unknown';
      default:
        return 'Inference Service Status';
    }
  };

  const bodyContent = modelStatus?.failedToSchedule
    ? modelStatus.failureMessage || 'Insufficient resources'
    : getInferenceServiceStatusMessage(inferenceService);

  return (
    <Popover
      data-testid="model-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={headerContent()}
      bodyContent={bodyContent}
      isVisible={bodyContent ? undefined : false}
    >
      {statusIcon()}
    </Popover>
  );
};

export default InferenceServiceStatus;
