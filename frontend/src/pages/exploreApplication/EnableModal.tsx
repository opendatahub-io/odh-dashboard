import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormAlert,
  Modal,
  ModalVariant,
  Spinner,
  TextInputTypes,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '~/types';
import { EnableApplicationStatus, useEnableApplication } from '~/utilities/useEnableApplication';
import { asEnumMember } from '~/utilities/utils';
import EnableVariable from './EnableVariable';
import './EnableModal.scss';

type EnableModalProps = {
  selectedApp: OdhApplication;
  shown: boolean;
  onClose: () => void;
};

// Poll /api/integrations/nim to confirm backend enablement
const fetchNimIntegrationStatus = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/integrations/nim');
    const data = await res.json();
    return data?.isEnabled === true;
  } catch {
    return false;
  }
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, shown, onClose }) => {
  const [postError, setPostError] = React.useState('');
  const [validationInProgress, setValidationInProgress] = React.useState(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});
  const [validationStatus, validationErrorMessage] = useEnableApplication(
    validationInProgress,
    selectedApp.metadata.name,
    selectedApp.spec.displayName,
    enableValues,
    selectedApp.spec.internalRoute,
  );

  const focusRef = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  const updateEnableValue = (key: string, value: string): void => {
    setEnableValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onDoEnableApp = () => {
    setPostError('');
    setValidationInProgress(true);
  };

  React.useEffect(() => {
    if (validationInProgress && validationStatus === EnableApplicationStatus.SUCCESS) {
      const interval = setInterval(async () => {
        const isEnabled = await fetchNimIntegrationStatus();
        if (isEnabled) {
          clearInterval(interval);
          clearTimeout(timeout);
          setValidationInProgress(false);
          onClose();
        }
      }, 1000);

      const timeout = setTimeout(() => {
        const timeoutError = 'Validation failed: The API key was not accepted by the backend.';
        clearInterval(interval);
        setPostError(timeoutError);
        setValidationInProgress(false);
      }, 50000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    if (validationInProgress && validationStatus === EnableApplicationStatus.FAILED) {
      setValidationInProgress(false);
      setPostError(validationErrorMessage);
    }

    return undefined;
  }, [
    validationInProgress,
    validationStatus,
    validationErrorMessage,
    onClose,
    selectedApp.metadata.name,
  ]);

  React.useEffect(() => {
    if (shown && !validationInProgress) {
      const isTimeoutError = postError.includes(
        'The API key was not accepted by the backend. Contact your admin.',
      );
      const isNim = selectedApp.metadata.name === 'nvidia-nim';

      if (!(isNim && isTimeoutError)) {
        setPostError('');
      }
    }
  }, [shown, validationInProgress, postError, selectedApp.metadata.name]);

  const handleClose = () => {
    if (!validationInProgress) {
      setEnableValues({});
    }
    onClose();
  };

  if (!selectedApp.spec.enable || !shown) {
    return null;
  }

  const { enable } = selectedApp.spec;

  return (
    <Modal
      aria-label={`Enable ${enable.title}`}
      className="odh-enable-modal"
      data-id="enable-modal"
      variant={ModalVariant.small}
      title={enable.title}
      isOpen
      onClose={handleClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onDoEnableApp}
          isDisabled={validationInProgress}
        >
          {enable.actionLabel}
        </Button>,
        <Button key="cancel" variant="link" onClick={handleClose}>
          {validationInProgress ? 'Close' : 'Cancel'}
        </Button>,
      ]}
    >
      {enable.description ? enable.description : null}
      {enable.link ? (
        <div className="odh-enable-modal__enable-link">
          {enable.linkPreface ? <div>{enable.linkPreface}</div> : null}
          <a href={enable.link} target="_blank" rel="noopener noreferrer">
            {enable.link} <ExternalLinkAltIcon />
          </a>
        </div>
      ) : null}
      {enable.variables ? (
        <Form>
          {postError ? (
            <FormAlert>
              <Alert
                variantLabel="error"
                variant="danger"
                title="Validation failed"
                aria-live="polite"
                isInline
              >
                {postError}
              </Alert>
            </FormAlert>
          ) : null}
          {validationInProgress ? (
            <FormAlert>
              <Alert
                className="m-no-alert-icon"
                variantLabel="information"
                variant="info"
                title={
                  <div className="odh-enable-modal__progress-title">
                    <Spinner size="md" /> Validating your entries
                  </div>
                }
                aria-live="polite"
                isInline
              />
            </FormAlert>
          ) : null}
          {Object.keys(enable.variables).map((key, index) => (
            <EnableVariable
              key={key}
              ref={index === 0 ? focusRef : undefined}
              label={enable.variableDisplayText?.[key] ?? ''}
              inputType={
                asEnumMember(enable.variables?.[key], TextInputTypes) ?? TextInputTypes.text
              }
              helperText={enable.variableHelpText?.[key] ?? ''}
              validationInProgress={validationInProgress}
              value={enableValues[key]}
              updateValue={(value: string) => updateEnableValue(key, value)}
            />
          ))}
        </Form>
      ) : null}
    </Modal>
  );
};

export default EnableModal;
