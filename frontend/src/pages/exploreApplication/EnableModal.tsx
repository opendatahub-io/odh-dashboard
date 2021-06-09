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
import { OdhApplication } from '../../types';
import {
  EnableApplicationStatus,
  useEnableApplication,
} from '../../utilities/useEnableApplication';
import EnableVariable from './EnableVariable';

import './EnableModal.scss';

type EnableModalProps = {
  selectedApp: OdhApplication;
  onClose: (success?: boolean) => void;
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, onClose }) => {
  const [postError, setPostError] = React.useState<boolean>(false);
  const [validationInProgress, setValidationInProgress] = React.useState<boolean>(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});
  const validationStatus = useEnableApplication(
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
    setPostError(false);
    setValidationInProgress(true);
  };

  React.useEffect(() => {
    if (validationInProgress && validationStatus === EnableApplicationStatus.SUCCESS) {
      setValidationInProgress(false);
      onClose(true);
    }
    if (validationInProgress && validationStatus === EnableApplicationStatus.FAILED) {
      setValidationInProgress(false);
      setPostError(true);
    }
  }, [onClose, validationInProgress, validationStatus]);

  return (
    <Modal
      aria-label={`Enable ${selectedApp?.spec.enable?.title}`}
      className="odh-enable-modal"
      variant={ModalVariant.small}
      title={selectedApp?.spec.enable?.title}
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onDoEnableApp}
          isDisabled={validationInProgress}
        >
          {selectedApp?.spec.enable?.actionLabel}
        </Button>,
        <Button key="cancel" variant="link" onClick={() => onClose()}>
          {validationInProgress ? 'Close' : 'Cancel'}
        </Button>,
      ]}
    >
      {selectedApp?.spec.enable?.description ? selectedApp.spec.enable.description : null}
      {selectedApp?.spec.enable?.variables ? (
        <Form>
          {postError ? (
            <FormAlert>
              <Alert
                variantLabel="error"
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
          {selectedApp.spec.enable?.variables
            ? Object.keys(selectedApp.spec.enable.variables).map((key, index) => (
                <EnableVariable
                  key={key}
                  ref={index === 0 ? focusRef : undefined}
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
