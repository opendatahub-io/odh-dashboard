import * as React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ALERT_TIMEOUT_MS } from '~/app/Chatbot/const';

type ModelSwitchSuccessAlertProps = {
  isVisible: boolean;
  alertKey: number;
  onClose: () => void;
  modelName: string | undefined;
};

const ModelSwitchSuccessAlert: React.FC<ModelSwitchSuccessAlertProps> = ({
  isVisible,
  alertKey,
  onClose,
  modelName,
}) => {
  if (!isVisible || !modelName) {
    return null;
  }

  return (
    <div style={{ margin: 'var(--pf-t--global--spacer--sm) 0' }}>
      <Alert
        key={`model-switch-success-${alertKey}`}
        isInline
        variant="success"
        title="Model updated"
        timeout={ALERT_TIMEOUT_MS}
        actionClose={<AlertActionCloseButton onClose={onClose} />}
        onTimeout={onClose}
        data-testid="model-switch-success-alert"
      >
        Switched to {modelName}, the model associated with this prompt.
      </Alert>
    </div>
  );
};

export default ModelSwitchSuccessAlert;
