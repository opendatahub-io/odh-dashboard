import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
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

type NIMApiKeyModalProps = {
  onClose: () => void;
  namespace: string;
  isReplacing: boolean;
  existingSecretName?: string;
  refresh: () => void;
  startRevalidation: () => void;
  accountStatus: NIMAccountStatus;
};

const NIMApiKeyModal: React.FC<NIMApiKeyModalProps> = ({
  onClose,
  namespace,
  isReplacing,
  existingSecretName,
  refresh,
  startRevalidation,
  accountStatus,
}) => {
  const [apiKey, setApiKey] = React.useState('');
  const [showKey, setShowKey] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [createError, setCreateError] = React.useState<string>();

  const handleSubmit = async () => {
    setIsCreating(true);
    setCreateError(undefined);

    try {
      if (isReplacing && existingSecretName) {
        await updateNIMSecretAndRevalidate(namespace, existingSecretName, apiKey);
        startRevalidation();
      } else {
        await createNIMResources(namespace, apiKey);
      }
      setSubmitted(true);
      refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create NIM resources.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    refresh();
  };

  const isValidating = submitted && accountStatus === NIMAccountStatus.PENDING;
  const isSuccess = submitted && accountStatus === NIMAccountStatus.READY;
  const hasError = !!createError || (submitted && accountStatus === NIMAccountStatus.ERROR);
  const isInputDisabled = isCreating || isValidating || isSuccess;
  const isSubmitDisabled = !apiKey.trim() || isInputDisabled;

  if (isSuccess) {
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
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
            </FlexItem>
            <FlexItem>Your NVIDIA personal API key has been validated and saved.</FlexItem>
          </Flex>
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
          label: isCreating || isValidating ? 'Validating' : 'Submit',
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
          isDisabled: isCreating || isValidating,
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
                  Invalid API key. Verify your key and try again.
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
