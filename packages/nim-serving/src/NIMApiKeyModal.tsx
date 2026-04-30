import React from 'react';
import {
  Button,
  FormGroup,
  TextInput,
  InputGroup,
  InputGroupItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import NIMAccountStatusAlerts from './NIMAccountStatusAlerts';
import useNIMAccountStatus, { NIMAccountStatus } from './useNIMAccountStatus';
import { createNIMResources, updateNIMSecretAndRevalidate } from './nimK8sUtils';

enum ModalState {
  IDLE = 'IDLE',
  CREATING = 'CREATING',
  VALIDATING = 'VALIDATING',
  ERROR = 'ERROR',
}

type NIMApiKeyModalProps = {
  onClose: () => void;
  namespace: string;
  isReplacing: boolean;
  existingSecretName?: string;
  onActionComplete: () => void;
};

const NIMApiKeyModal: React.FC<NIMApiKeyModalProps> = ({
  onClose,
  namespace,
  isReplacing,
  existingSecretName,
  onActionComplete,
}) => {
  const [apiKey, setApiKey] = React.useState('');
  const [showKey, setShowKey] = React.useState(false);
  const [modalState, setModalState] = React.useState<ModalState>(ModalState.IDLE);
  const [createError, setCreateError] = React.useState<string>();

  const {
    status: accountStatus,
    errorMessages: accountErrors,
    refresh,
  } = useNIMAccountStatus(namespace);

  React.useEffect(() => {
    if (modalState !== ModalState.VALIDATING) {
      return;
    }
    if (accountStatus === NIMAccountStatus.READY) {
      onClose();
      onActionComplete();
    } else if (accountStatus === NIMAccountStatus.ERROR) {
      setModalState(ModalState.ERROR);
    }
  }, [modalState, accountStatus, onClose, onActionComplete]);

  const handleSubmit = async () => {
    setModalState(ModalState.CREATING);
    setCreateError(undefined);

    try {
      if (isReplacing && existingSecretName) {
        await updateNIMSecretAndRevalidate(namespace, existingSecretName, apiKey);
      } else {
        await createNIMResources(namespace, apiKey);
      }
      setModalState(ModalState.VALIDATING);
      refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create NIM resources.');
      setModalState(ModalState.IDLE);
    }
  };

  const handleClose = () => {
    setApiKey('');
    setShowKey(false);
    setModalState(ModalState.IDLE);
    setCreateError(undefined);
    onClose();
    if (modalState === ModalState.VALIDATING) {
      onActionComplete();
    }
  };

  const isInputDisabled =
    modalState === ModalState.CREATING || modalState === ModalState.VALIDATING;
  const isSubmitDisabled = !apiKey.trim() || isInputDisabled;
  const isSubmitLoading = modalState === ModalState.CREATING;
  const cancelLabel = modalState === ModalState.VALIDATING ? 'Close' : 'Cancel';

  return (
    <ContentModal
      title="Enter NVIDIA personal API key"
      onClose={handleClose}
      variant="medium"
      dataTestId="nim-api-key-modal"
      buttonActions={[
        {
          label: 'Submit',
          onClick: handleSubmit,
          variant: 'primary',
          isDisabled: isSubmitDisabled,
          isLoading: isSubmitLoading,
          dataTestId: 'nim-api-key-submit',
        },
        {
          label: cancelLabel,
          onClick: handleClose,
          variant: 'link',
          dataTestId: 'nim-api-key-cancel',
        },
      ]}
      contents={
        <Stack hasGutter>
          {createError && (
            <StackItem>
              <NIMAccountStatusAlerts
                status={NIMAccountStatus.ERROR}
                errorMessages={[createError]}
              />
            </StackItem>
          )}
          {modalState === ModalState.VALIDATING && (
            <StackItem>
              <NIMAccountStatusAlerts status={NIMAccountStatus.PENDING} errorMessages={[]} />
            </StackItem>
          )}
          {modalState === ModalState.ERROR && (
            <StackItem>
              <NIMAccountStatusAlerts
                status={NIMAccountStatus.ERROR}
                errorMessages={accountErrors}
              />
            </StackItem>
          )}
          <StackItem>
            <FormGroup label="NVIDIA personal API key" fieldId="nim-api-key">
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    id="nim-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(_e, value) => setApiKey(value)}
                    isDisabled={isInputDisabled}
                    data-testid="nim-api-key-input"
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Button
                    variant="control"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    data-testid="nim-api-key-toggle"
                  >
                    {showKey ? <EyeSlashIcon /> : <EyeIcon />}
                  </Button>
                </InputGroupItem>
              </InputGroup>
              <div className="pf-v6-c-form__helper-text">This key is given to you by NVIDIA</div>
            </FormGroup>
          </StackItem>
        </Stack>
      }
    />
  );
};

export default NIMApiKeyModal;
