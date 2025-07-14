import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormAlert,
  Spinner,
  TextInputTypes,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { isEmpty, values } from 'lodash-es';
import { OdhApplication } from '#~/types';
import { EnableApplicationStatus, useEnableApplication } from '#~/utilities/useEnableApplication';
import { asEnumMember } from '#~/utilities/utils';
import EnableVariable from './EnableVariable';
import './EnableModal.scss';

type EnableModalProps = {
  selectedApp: OdhApplication;
  onClose: () => void;
};

const EnableModal: React.FC<EnableModalProps> = ({ selectedApp, onClose }) => {
  const [postError, setPostError] = React.useState('');
  const [validationInProgress, setValidationInProgress] = React.useState(false);
  const [enableValues, setEnableValues] = React.useState<{ [key: string]: string }>({});
  const isEnableValuesHasEmptyValue = React.useMemo(
    () => isEmpty(enableValues) || values(enableValues).some((val) => isEmpty(val)),
    [enableValues],
  );
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

  const handleClose = React.useCallback(() => {
    // Clear only the values, keeping the keys intact
    const resetValues: { [key: string]: string } = {};
    Object.keys(enableValues).forEach((key) => {
      resetValues[key] = '';
    });
    setEnableValues(resetValues);
    setPostError('');
    onClose();
  }, [onClose, enableValues]);

  React.useEffect(() => {
    if (validationInProgress && validationStatus === EnableApplicationStatus.SUCCESS) {
      setValidationInProgress(false);
      // TODO: Disable rule below temporarily. Refactor to notify the owner and avoid modifying the object directly.
      /* eslint-disable no-param-reassign */
      selectedApp.spec.isEnabled = true;
      selectedApp.spec.shownOnEnabledPage = true;
      /* eslint-enable no-param-reassign */

      handleClose();
    }
    if (validationInProgress && validationStatus === EnableApplicationStatus.FAILED) {
      setValidationInProgress(false);
      setPostError(validationErrorMessage);
    }
  }, [
    handleClose,
    selectedApp.spec,
    validationErrorMessage,
    validationInProgress,
    validationStatus,
  ]);

  if (!selectedApp.spec.enable) {
    return null;
  }
  const { enable } = selectedApp.spec;

  return (
    <Modal
      aria-label={`Enable ${enable.title}`}
      className="odh-enable-modal"
      data-id="enable-modal"
      variant="small"
      isOpen
      onClose={handleClose}
    >
      <ModalHeader title={enable.title || `Enable ${selectedApp.spec.displayName}`} />
      <ModalBody>
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
                      <Spinner size="md" />
                      {enable.inProgressText ? (
                        <div style={{ whiteSpace: 'pre-line' }}>{enable.inProgressText}</div>
                      ) : (
                        'Validating your entries'
                      )}
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
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="enable-app-submit"
          key="confirm"
          variant="primary"
          onClick={onDoEnableApp}
          isDisabled={validationInProgress || (enable.variables && isEnableValuesHasEmptyValue)}
        >
          {enable.actionLabel || 'Enable'}
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose}>
          {validationInProgress ? 'Close' : 'Cancel'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EnableModal;
