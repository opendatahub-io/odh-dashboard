import * as React from 'react';
import { Text, Icon, Spinner, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { InferenceServiceModelState } from '~/pages/modelServing/screens/types';
import { getInferenceServiceActiveModelState, getInferenceServiceErrorMessage } from './utils';

type InferenceServiceStatusProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceStatus: React.FC<InferenceServiceStatusProps> = ({ inferenceService }) => {
  const state = getInferenceServiceActiveModelState(inferenceService);

  const StatusIcon = () => {
    switch (state) {
      case InferenceServiceModelState.LOADED:
      case InferenceServiceModelState.STANDBY:
        return (
          <Icon role="button" aria-label="success icon" status="success" isInline tabIndex={0}>
            <CheckCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return (
          <Icon role="button" aria-label="error icon" status="danger" isInline tabIndex={0}>
            <ExclamationCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.PENDING:
      case InferenceServiceModelState.LOADING:
        return (
          <Icon isInline>
            <Spinner isSVG size="md" />
          </Icon>
        );
      case InferenceServiceModelState.UNKNOWN:
        return (
          <Icon role="button" aria-label="warning icon" status="warning" isInline tabIndex={0}>
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
      default:
        return (
          <Icon role="button" aria-label="warning icon" status="warning" isInline tabIndex={0}>
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
    }
  };

  return (
    <Tooltip
      removeFindDomNode
      role="none"
      content={<Text>{getInferenceServiceErrorMessage(inferenceService)}</Text>}
    >
      {StatusIcon()}
    </Tooltip>
  );
};

export default InferenceServiceStatus;
