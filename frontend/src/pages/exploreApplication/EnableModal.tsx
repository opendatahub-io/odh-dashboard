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
import { OdhApplication } from '../../types';
import {
  EnableApplicationStatus,
  useEnableApplication,
} from '../../utilities/useEnableApplication';
import EnableVariable from './EnableVariable';

import './EnableModal.scss';

type EnableModalProps = {
  selectedApp: OdhApplication;
  shown: boolean;
  onClose: () => void;
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, shown, onClose }) => {
  const [postError, setPostError] = React.useState<string>('');
  const [validationInProgress, setValidationInProgress] = React.useState<boolean>(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});
  const [validationStatus, validationErrorMessage] = useEnableApplication(
    validationInProgress,
    selectedApp.metadata.name,
    selectedApp.spec.displayName,
    enableValues,
  );
  const focusRef = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  const updateEnableValue = (key: string, value: string): void => {
    const updatedValues = {
      ...enableValues,
      [key]: value,
    };
    setEnableValues(updatedValues);
  };

  const onDoEnableApp = () => {
    setPostError('');
    setValidationInProgress(true);
  };

  React.useEffect(() => {
    if (validationInProgress && validationStatus === EnableApplicationStatus.SUCCESS) {
      setValidationInProgress(false);
      selectedApp.spec.isEnabled = true;
      onClose();
    }
    if (validationInProgress && validationStatus === EnableApplicationStatus.FAILED) {
      setValidationInProgress(false);
      setPostError(validationErrorMessage);
    }
  }, [onClose, selectedApp.spec, validationErrorMessage, validationInProgress, validationStatus]);

  React.useEffect(() => {
    if (shown) {
      if (!validationInProgress) {
        setPostError('');
      }
    }
    // Only update when shown is updated to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const handleClose = () => {
    if (!validationInProgress) {
      setEnableValues({});
    }
    onClose();
  };

  if (!selectedApp?.spec?.enable || !shown) {
    return null;
  }
  const { enable } = selectedApp.spec;

  return (
    <Modal
      aria-label={`Enable ${enable.title}`}
      className="odh-enable-modal"
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
          <a
            className="odh-dashboard__external-link"
            href={enable.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {enable.link}
            <ExternalLinkAltIcon />
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
                    <Spinner isSVG size="md" /> Validating your entries
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
              inputType={enable.variables?.[key] as TextInputTypes}
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
