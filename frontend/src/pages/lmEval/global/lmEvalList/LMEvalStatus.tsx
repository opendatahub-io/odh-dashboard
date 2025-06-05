import * as React from 'react';
import { Icon, Popover, Button } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { LMEvalKind } from '#~/k8sTypes';
import { LMEvalState } from '#~/pages/lmEval/types';
import { getLMEvalStatusMessage, getLMEvalState } from './utils';

type LMEvalStatusProps = {
  status: LMEvalKind['status'];
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
};

const LMEvalStatus: React.FC<LMEvalStatusProps> = ({ status, iconSize = 'sm' }) => {
  const currentState = getLMEvalState(status);
  const statusMessage = getLMEvalStatusMessage(status);

  const statusIcon = () => {
    if (currentState === LMEvalState.PENDING || currentState === LMEvalState.RUNNING) {
      return (
        <Icon isInline iconSize={iconSize}>
          <InProgressIcon />
        </Icon>
      );
    }

    let iconStatus: 'success' | 'danger' | 'warning';
    let IconComponent: React.ComponentType;

    switch (currentState) {
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
      <Button
        variant="link"
        isInline
        data-testid="status-tooltip"
        icon={
          <Icon status={iconStatus} isInline iconSize={iconSize}>
            <IconComponent />
          </Icon>
        }
      />
    );
  };

  const headerContent = () => {
    switch (currentState) {
      case LMEvalState.COMPLETE:
        return 'Evaluation Complete';
      case LMEvalState.FAILED:
        return 'Evaluation Failed';
      case LMEvalState.PENDING:
        return 'Evaluation Pending';
      case LMEvalState.RUNNING:
        return 'Evaluation Running';
      default:
        return 'Evaluation Status';
    }
  };

  const bodyContent = () => {
    if (currentState === LMEvalState.FAILED) {
      return status?.reason || status?.message || 'Unknown';
    }
    return statusMessage;
  };

  return (
    <Popover
      data-testid="lmeval-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={headerContent()}
      bodyContent={bodyContent()}
      isVisible={bodyContent() ? undefined : false}
    >
      {statusIcon()}
    </Popover>
  );
};

export default LMEvalStatus;
