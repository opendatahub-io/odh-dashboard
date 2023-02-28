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
          <Icon status="success" isInline>
            <CheckCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return (
          <Icon status="danger" isInline>
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
          <Icon status="warning" isInline>
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
      default:
        return (
          <Icon status="warning" isInline>
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
    }
  };

  return (
    <Tooltip
      removeFindDomNode
      aria-label="State Info"
      content={<Text>{getInferenceServiceErrorMessage(inferenceService)}</Text>}
    >
      {StatusIcon()}
    </Tooltip>
  );
};

export default InferenceServiceStatus;
