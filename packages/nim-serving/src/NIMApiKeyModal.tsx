import React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  InputGroup,
  InputGroupItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { NIMAccountStatus } from './useNIMAccountStatus';
import { createNIMResources, updateNIMSecretAndRevalidate } from './nimK8sUtils';

enum ModalState {
  IDLE = 'IDLE',
  CREATING = 'CREATING',
  VALIDATING = 'VALIDATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

type NIMApiKeyModalProps = {
  onClose: () => void;
  namespace: string;
  isReplacing: boolean;
  existingSecretName?: string;
  refresh: () => void;
  startRevalidation: () => void;
  accountStatus: NIMAccountStatus;
  accountErrors: string[];
};

const NIMApiKeyModal: React.FC<NIMApiKeyModalProps> = ({
  onClose,
  namespace,
  isReplacing,
  existingSecretName,
  refresh,
  startRevalidation,
  accountStatus,
  accountErrors,
}) => {
  const [apiKey, setApiKey] = React.useState('');
  const [showKey, setShowKey] = React.useState(false);
  const [modalState, setModalState] = React.useState<ModalState>(ModalState.IDLE);
  const [createError, setCreateError] = React.useState<string>();

  React.useEffect(() => {
    if (modalState !== ModalState.VALIDATING && modalState !== ModalState.ERROR) {
      return;
    }
    if (accountStatus === NIMAccountStatus.READY) {
      setModalState(ModalState.SUCCESS);
      refresh();
    } else if (accountStatus === NIMAccountStatus.ERROR) {
      setModalState(ModalState.ERROR);
    } else if (accountStatus === NIMAccountStatus.PENDING && modalState === ModalState.ERROR) {
      setModalState(ModalState.VALIDATING);
    }
  }, [modalState, accountStatus, refresh]);

  const handleSubmit = async () => {
    setModalState(ModalState.CREATING);
    setCreateError(undefined);

    try {
      if (isReplacing && existingSecretName) {
        await updateNIMSecretAndRevalidate(namespace, existingSecretName, apiKey);
        startRevalidation();
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
    refresh();
  };

  const isInputDisabled =
    modalState === ModalState.CREATING ||
    modalState === ModalState.VALIDATING ||
    modalState === ModalState.SUCCESS;
  const isSubmitDisabled = !apiKey.trim() || isInputDisabled;
  const isValidating = modalState === ModalState.VALIDATING;
  const isCreating = modalState === ModalState.CREATING;
  const hasError = modalState === ModalState.ERROR || !!createError;
  const errorMessage =
    createError ||
    (accountErrors.length > 0 ? accountErrors.join('; ') : 'API key failed validation.');

  if (modalState === ModalState.SUCCESS) {
    return (
      <ContentModal
        title="API key validated"
        onClose={handleClose}
        variant="medium"
        dataTestId="nim-api-key-modal"
        buttonActions={[
          {
            label: 'Close',
            onClick: handleClose,
            variant: 'primary',
            dataTestId: 'nim-api-key-close',
          },
        ]}
        contents={
          <HelperText>
            <HelperTextItem icon={<CheckCircleIcon />} variant="success">
              Your NVIDIA personal API key has been validated and saved.
            </HelperTextItem>
          </HelperText>
        }
      />
    );
  }

  return (
    <ContentModal
      title="Enter NVIDIA personal API key"
      onClose={handleClose}
      variant="medium"
      dataTestId="nim-api-key-modal"
      buttonActions={[
        {
          label: isValidating ? 'Validating' : 'Submit',
          onClick: handleSubmit,
          variant: 'primary',
          isDisabled: isSubmitDisabled,
          isLoading: isCreating || isValidating,
          dataTestId: 'nim-api-key-submit',
        },
        {
          label: 'Cancel',
          onClick: handleClose,
          variant: 'link',
          dataTestId: 'nim-api-key-cancel',
        },
      ]}
      contents={
        <FormGroup label="NVIDIA personal API key" fieldId="nim-api-key">
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                id="nim-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(_e, value) => setApiKey(value)}
                isDisabled={isInputDisabled}
                validated={hasError ? ValidatedOptions.error : ValidatedOptions.default}
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
          <FormHelperText>
            <HelperText>
              {hasError ? (
                <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                  {errorMessage}
                </HelperTextItem>
              ) : (
                <HelperTextItem>This key is given to you by NVIDIA</HelperTextItem>
              )}
            </HelperText>
          </FormHelperText>
        </FormGroup>
      }
    />
  );
};

export default NIMApiKeyModal;
