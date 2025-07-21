import * as React from 'react';
import { Label } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedQuestionCircleIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { LMEvalKind } from '#~/k8sTypes';
import { LMEvalState } from '#~/pages/lmEval/types';
import { getLMEvalState } from '#~/pages/lmEval/global/lmEvalList/utils';

type LMEvalStatusLabelProps = {
  status?: LMEvalKind['status'];
};

const LMEvalStatusLabel: React.FC<LMEvalStatusLabelProps> = ({ status }) => {
  const currentState = getLMEvalState(status);

  let iconStatus: 'success' | 'danger' | 'warning' | 'info';

  let IconComponent: React.ComponentType;

  if (currentState === LMEvalState.IN_PROGRESS) {
    return (
      <Label isCompact color="blue" icon={<InProgressIcon />} data-testid="evaluation-run-status">
        {currentState}
      </Label>
    );
  }

  switch (currentState) {
    case LMEvalState.PENDING:
      iconStatus = 'info';
      IconComponent = PendingIcon;
      break;
    case LMEvalState.COMPLETE:
      iconStatus = 'success';
      IconComponent = CheckCircleIcon;
      break;
    case LMEvalState.FAILED:
      iconStatus = 'danger';
      IconComponent = ExclamationCircleIcon;
      break;
    default:
      iconStatus = 'warning';
      IconComponent = OutlinedQuestionCircleIcon;
      break;
  }

  return (
    <Label
      isCompact
      status={iconStatus}
      icon={<IconComponent />}
      data-testid="evaluation-run-status"
    >
      {currentState}
    </Label>
  );
};

export default LMEvalStatusLabel;
