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
import { ODHApp } from '../../types';
import { postValidateIsv } from '../../services/validateIsvService';
import EnableVariable from './EnableVariable';

import './EnableModal.scss';

type EnableModalProps = {
  selectedApp?: ODHApp;
  onClose: (success?: boolean) => void;
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, onClose }) => {
  const [postError, setPostError] = React.useState<boolean>(false);
  const [validationInProgress, setValidationInProgress] = React.useState<boolean>(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});
  const focusRef = (element: HTMLElement) => {
    if (element) {
      element.focus();
    }
  };

  if (!selectedApp) {
    return null;
  }

  const updateEnableValue = (key: string, value: string): void => {
    const updatedValues = {
      ...enableValues,
      [key]: value,
    };
    setEnableValues(updatedValues);
  };

  const onDoEnableApp = () => {
    setPostError(false);
    setValidationInProgress(true);
    postValidateIsv(selectedApp.metadata.name, enableValues)
      .then((valid) => {
        setValidationInProgress(false);
        if (valid) {
          onClose(true);
          return;
        }
        setPostError(true);
      })
      .catch(() => {
        setValidationInProgress(false);
        setPostError(true);
      });
  };

  return (
    <Modal
      className="odh-enable-modal"
      variant={ModalVariant.small}
      title={selectedApp.spec.enable?.title}
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onDoEnableApp}
          isDisabled={validationInProgress}
        >
          {selectedApp.spec.enable?.actionLabel}
        </Button>,
        <Button key="cancel" variant="link" onClick={() => onClose()}>
          Cancel
        </Button>,
      ]}
    >
      {selectedApp.spec.enable?.description ? selectedApp.spec.enable?.description : null}
      {selectedApp.spec.enable?.variables ? (
        <Form>
          {postError ? (
            <FormAlert>
              <Alert
                variantLabel=""
                variant="danger"
                title="Error attempting to validate. Please check your entries."
                aria-live="polite"
                isInline
              />
            </FormAlert>
          ) : null}
          {validationInProgress ? (
            <FormAlert>
              <Alert
                className="m-no-alert-icon"
                variantLabel=""
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
          {selectedApp.spec.enable?.variables
            ? Object.keys(selectedApp.spec.enable.variables).map((key, index) => (
                <EnableVariable
                  key={key}
                  ref={index === 0 ? focusRef : null}
                  label={selectedApp.spec.enable?.variableDisplayText?.[key] ?? ''}
                  inputType={selectedApp.spec.enable?.variables?.[key] as TextInputTypes}
                  helperText={selectedApp.spec.enable?.variableHelpText?.[key] ?? ''}
                  validationInProgress={validationInProgress}
                  updateValue={(value: string) => updateEnableValue(key, value)}
                />
              ))
            : null}
        </Form>
      ) : null}
    </Modal>
  );
};

export default EnableModal;
